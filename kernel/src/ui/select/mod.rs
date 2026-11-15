mod delegate;

use crate as deft;
use crate::js_module;
use crate::edit::editable::Editable;
use crate::image::image_object::ImageObject;
use crate::ui::label::Label;
use crate::ui::{Element, Widget};
use crate::event::ClickEventListener;
use crate::mrc::Mrc;
use crate::style::length::{Length, LengthOrPercent};
use crate::style::{FixedStyleProp, StylePropVal};
use crate::text::textbox::TextBox;
use crate::window::popup::Popup;
use crate::{js_deserialize, js_serialize, ok_or_return, some_or_return};
use deft_macros::{widget, event, js_methods};
use serde::{Deserialize, Serialize};
use std::ops::DerefMut;
use crate::ui::select::delegate::{SelectDelegate, SelectDelegateData};

#[derive(Serialize, Deserialize, Clone)]
pub struct SelectOption {
    value: String,
    label: String,
}

js_serialize!(SelectOption);
js_deserialize!(SelectOption);

#[event]
pub struct ChangeEvent {}

#[widget]
pub struct Select {
    state: SelectDelegate,
}

impl Widget for Select {}

js_module!(Select);

#[js_methods]
impl Select {
   
    #[js_func]
    pub fn set_value(&mut self, value: String) {
        self.state.set_value(value)
    }

    #[js_func]
    pub fn get_value(&self) -> String {
        self.state.value.clone()
    }

    #[js_func]
    pub fn set_options(&mut self, options: Vec<SelectOption>) {
        self.state.options = options;
    }

    #[js_func]
    pub fn get_options(&self) -> Vec<SelectOption> {
        self.state.options.clone()
    }

    #[js_func]
    pub fn set_placeholder(&mut self, value: String) {
        self.state.placeholder.clear();
        self.state.placeholder.add_line(Editable::build_line(value));
        self.el.style.make_layout_dirty();
    }

    #[js_func]
    pub fn get_placeholder(&self) -> String {
        self.state.placeholder.get_text()
    }

    #[js_func]
    pub fn create() -> Self {
        let mut element = Element::new("select");
        element.is_form_element = true;
        element.register_js_event::<ChangeEvent>("change");
        let label = Label::create();
        element.add_child(&label, Some(0)).unwrap();

        let select_img = ImageObject::from_svg_bytes(include_bytes!("./select.svg"));

        let placeholder = TextBox::new();

        let state = SelectDelegateData {
            placeholder,
            select_img,
            element_weak: element.as_weak(),
            options_style: vec![],
            option_style: vec![],
            option_hover_style: vec![],
            label,
            value: "".to_string(),
            options: vec![],
        }.to_ref();

        element.set_layout_listener(state.clone());
        element.set_delegate(state.clone());
        let mut inst = Self {
            el: element,
            state,
        };
        let el = inst.el.as_weak();
        let me = inst.state.as_weak();
        inst.el.register_event_listener(ClickEventListener::new(move |_e, _ctx| {
            let el = ok_or_return!(el.upgrade());
            let w = some_or_return!(el.get_window());
            let bounds = el.get_origin_bounds();

            let mut popup: Mrc<Option<Popup>> = Mrc::new(None);
            let mut popup_mrc = popup.clone();
            let me2 = me.clone();
            let value_setter = move |v| {
                let mut select = ok_or_return!(me2.upgrade());
                select.set_value(v);
                if let Some(p) = popup_mrc.deref_mut() {
                    let _ = p.clone().close();
                }
            };
            let me = ok_or_return!(me.upgrade());
            let mut options = me.build_options_element(value_setter);
            options.set_style_props(vec![FixedStyleProp::MinWidth(StylePropVal::Custom(
                LengthOrPercent::Length(Length::PX(bounds.width)),
            ))]);
            *popup = Some(Popup::new(&options, bounds, &w));
        }));
        inst
    }

}
