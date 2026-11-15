use crate as deft;
use crate::base::{EventContext, EventListener, EventRegistration};
use crate::event_loop::{create_event_loop_fn_mut};
use crate::{bind_js_event_listener, js_deserialize, js_module, js_value};
use anyhow::Error;
use deft_macros::{event, js_methods, mrc_object};
use deft_tray::{Tray, TrayMenu};
use image::ImageReader;
use quick_js::JsValue;
use std::cell::Cell;
use crate::js::JsError;

thread_local! {
    pub static NEXT_TRAY_ID: Cell<u32> = Cell::new(1);
}

#[event]
pub struct MenuClickEvent(String);

#[event]
pub struct ActivateEvent;

#[mrc_object]
pub struct SystemTray {
    event_registration: EventRegistration,
    id: u32,
    tray_impl: Tray,
}

js_value!(SystemTray);

js_deserialize!(TrayMenu);

js_module!(SystemTray, include_str!("./system-tray.js"));

#[js_methods]
impl SystemTray {
    #[js_func]
    pub fn create(id: String) -> Result<SystemTray, Error> {
        let tray = SystemTray::create_tray(&id);
        Ok(tray)
    }

    fn create_tray(tray_id: &str) -> Self {
        let inner_id = NEXT_TRAY_ID.get();
        NEXT_TRAY_ID.set(inner_id + 1);

        let tray_impl = Tray::new(tray_id);

        let mut inst = SystemTrayData {
            event_registration: EventRegistration::new(),
            id: inner_id,
            tray_impl,
        }
        .to_ref();

        let mut me = inst.clone();
        let mut menu_active_callback = create_event_loop_fn_mut(move |menu_id: String| {
            me.event_registration.emit(MenuClickEvent(menu_id), &mut EventContext::new());
        });

        let mut sr = inst.clone();
        let mut activate_callback = create_event_loop_fn_mut(move |()| {
            sr.event_registration.emit(ActivateEvent, &mut EventContext::new());
        });
        inst.tray_impl.set_active_callback(Box::new(move || {
            activate_callback.call(());
        }));
        inst.tray_impl.set_menu_click_callback(Box::new(move |id| {
            menu_active_callback.call(id);
        }));
        inst
    }

    #[js_func]
    pub fn remove_event_listener(&mut self, event_type: String, id: i32) {
        self.inner
            .event_registration
            .remove_event_listener(&event_type, id as u32);
    }

    #[js_func]
    pub fn bind_event(&mut self, event_type: String, listener: JsValue) -> Result<u32, JsError> {
        let id = bind_js_event_listener!(
            self, event_type.as_str(), listener;
            "menuclick" => MenuClickEventListener,
            "activate"  => ActivateEventListener,
        );
        let id = id.ok_or_else(|| JsError::new(format!("unknown event_type:{}", event_type)))?;
        Ok(id)
    }

    #[js_func]
    pub fn get_id(&self) -> u32 {
        self.id
    }

    #[js_func]
    pub fn set_title(&mut self, title: String) {
        self.tray_impl.set_title(&title);
    }

    #[js_func]
    pub fn set_show_menu_on_left_click(&mut self, value: bool) {
        self.tray_impl.set_show_menu_on_left_click(value);
    }

    #[js_func]
    pub fn set_icon(&mut self, icon: String) {
        #[cfg(target_os = "linux")]
        self.tray_impl.set_icon(&icon);
        #[cfg(not(target_os = "linux"))]
        if let Some((img, width, height)) = Self::load_image(&icon) {
            self.tray_impl.set_icon_from_rgba(img, width, height);
        }
    }

    #[js_func]
    pub fn set_menus(&mut self, menus: Vec<TrayMenu>) {
        self.tray_impl.set_menus(menus);
    }

    fn load_image(path: &str) -> Option<(Vec<u8>, u32, u32)> {
        let img = ImageReader::open(path).ok()?.decode().ok()?;
        let rgba_img = img.to_rgba8();
        let width = img.width();
        let height = img.height();
        Some((rgba_img.into_raw(), width, height))
    }

    pub fn register_event_listener<T: 'static, H: EventListener<T> + 'static>(
        &mut self,
        listener: H,
    ) -> u32 {
        self.event_registration.register_event_listener(listener)
    }

    pub fn unregister_event_listener(&mut self, id: u32) {
        self.event_registration.unregister_event_listener(id)
    }

}
