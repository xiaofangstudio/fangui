mod delegate;

use crate as deft;
use crate::ui::container::Container;
use crate::{js_module, style};
use crate::ui::image::Image;
use crate::ui::label::Label;
use crate::ui::{Element, Widget};
use crate::event::{ClickEventListener};
use crate::some_or_return;
use deft_macros::{widget, event, js_methods};
use anyhow::anyhow;
use crate::ui::radio::delegate::{RadioDelegate, RadioGroupDelegate};

#[event]
pub struct ChangeEvent {}

#[widget]
pub struct Radio {
    base: Container,
    label: Label,
}

js_module!(Radio);
impl Widget for Radio {}

#[js_methods]
impl Radio {

    #[js_func]
    pub fn set_label(&mut self, label: String) {
        self.label.set_text(label);
    }

    #[js_func]
    pub fn get_label(&mut self) -> String {
        self.label.get_text()
    }

    #[js_func]
    pub fn is_checked(&self) -> anyhow::Result<bool> {
        let state = self.get_state()?;
        Ok(state.checked)
    }

    #[js_func]
    pub fn set_checked(&mut self, checked: bool) {
        if checked {
            self.el.set_attribute("checked".to_string(), "".to_string());
        } else {
            self.el.remove_attribute("checked".to_string());
        }
    }

    fn get_state(&self) -> anyhow::Result<RadioDelegate> {
        let state = some_or_return!(self.el.resource_table.get::<RadioDelegate>(), Err(anyhow!("state not found")));
        Ok(state.clone())
    }

    #[js_func]
    pub fn create() -> Self {
        let mut element = Element::new("radio");
        element.is_form_element = true;
        let base = Container::create();
        let mut wrapper_element = Container::create();
        let mut box_element = Container::create();
        let label = Label::create();
        let mut img = Image::create();
        img.set_src_svg_raw(include_bytes!("./selected.svg"));
        img.set_style(style!("width:100%; height:100%;"));
        box_element.add_child(&img, Some(0)).unwrap();

        wrapper_element.add_child(&box_element, Some(0)).unwrap();
        wrapper_element.add_child(&label, Some(1)).unwrap();

        element.add_child(&wrapper_element, Some(0)).unwrap();
        wrapper_element.set_style(style!("align-items:center; flex-direction:row;"));
        let mut radio_state = RadioDelegate::new(box_element, element.as_weak(), img);
        radio_state.update_children();
        element.set_delegate(radio_state.clone());

        element.resource_table.put(radio_state.clone());
        let mut inst = Radio {
            el: element,
            base,
            label,
        };
        
        inst.el.register_event_listener(ClickEventListener::new(move |_e, _ctx| {
            let _ = radio_state.update_checked(true);
        }));
        inst
    }

}



#[widget]
pub struct RadioGroup {
    base: Container,
}

impl Widget for RadioGroup {}

js_module!(RadioGroup);

#[js_methods]
impl RadioGroup {

    #[js_func]
    pub fn create() -> Self {
        let mut element = Element::new("radio-group");
        element.register_js_event::<ChangeEvent>("change");
        element.set_delegate(RadioGroupDelegate::new());
        let base = Container::create();
        RadioGroup {
            el: element,
            base
        }
    }
}

