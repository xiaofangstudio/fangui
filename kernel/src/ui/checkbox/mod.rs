mod delegate;

use crate as deft;
use crate::ui::container::Container;
use crate::ui::image::Image;
use crate::ui::{Element, Widget};
use crate::event::{ClickEventListener};
use crate::{ok_or_return, style};
use deft_macros::{widget, event, js_methods};
use crate::js_module;
use crate::ui::checkbox::delegate::{CheckboxDelegate, CheckboxDelegateData};
use crate::ui::label::Label;

#[event]
pub struct ChangeEvent {}



#[widget]
pub struct Checkbox {
    state: CheckboxDelegate,
}

impl Widget for Checkbox {}


js_module!(Checkbox);

#[js_methods]
impl Checkbox {
    #[js_func]
    pub fn set_label(&mut self, label: String) {
        self.state.label.set_text(label);
    }

    #[js_func]
    pub fn get_label(&mut self) -> String {
        self.state.label.get_text()
    }

    #[js_func]
    pub fn is_checked(&self) -> bool {
        self.state.checked
    }

    #[js_func]
    pub fn set_checked(&mut self, checked: bool) {
        let mut el = ok_or_return!(self.state.element.upgrade());
        if checked {
            el.set_attribute("checked".to_string(), "".to_string());
        } else {
            el.remove_attribute("checked".to_string());
        }
    }

    #[js_func]
    pub fn create() -> Self {
        let mut element = Element::new("checkbox");
        element.is_form_element = true;
        element.register_js_event::<ChangeEvent>("change");
        let mut wrapper = Container::create();
        let mut box_container = Container::create();
        let label = Label::create();
        let mut img = Image::create();
        img.set_src_svg_raw(include_bytes!("./checked.svg"));
        img.set_style(style!("width:100%; height: 100%"));
        box_container.add_child(&img, Some(0)).unwrap();

        wrapper.add_child(&box_container, Some(0)).unwrap();
        wrapper.add_child(&label, Some(1)).unwrap();

        element.add_child(&wrapper, Some(0)).unwrap();
        wrapper.set_style(style!("align-items:center; flex-direction:row;"));
        let delegate = CheckboxDelegateData {
            box_container,
            img,
            checked: false,
            element: element.as_weak(),
            label,
        }.to_ref();
        element.set_delegate(delegate.clone());
        {
            let mut delegate = delegate.clone();
            element.register_event_listener(ClickEventListener::new(move |_e, _ctx| {
                let checked = !delegate.checked;
                delegate.update_checked(checked);
            }));
        }
        let mut inst = Checkbox {
            el: element,
            state: delegate,
        };
        inst.state.update_children();
        inst
    }
}
