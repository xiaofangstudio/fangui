mod delegate;

use crate as deft;
use crate::js_module;
use crate::ui::{Element, Widget};
use deft_macros::{widget, js_methods};
use crate::ui::label::delegate::LabelDelegate;

#[widget]
pub struct Label {
    delegate: LabelDelegate,
}

js_module!(Label);

#[js_methods]
impl Label {

    #[js_func]
    pub fn set_text(&mut self, text: String) {
        self.delegate.set_text(&text);
    }

    #[js_func]
    pub fn get_text(&self) -> String {
        self.delegate.text.clone()
    }

    #[js_func]
    pub fn create() -> Self {
        let el = Element::new("label");
        let state = LabelDelegate::new(el.as_weak());
        let mut label = Self {
            el,
            delegate: state.clone(),
        };
        label.el.set_delegate(state.clone());
        label.el.set_layout_listener(state.clone());
        label.el.style.set_layout_measurer(state.clone());
        label
    }

}

impl Widget for Label {

}