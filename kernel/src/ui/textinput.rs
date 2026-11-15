use crate as deft;
use crate::edit::editable::{Editable, InputType};
use crate::{js_module, style};
use crate::ui::{Element, Widget};
use deft_macros::{widget, js_methods};
use crate::ui::container::Container;

#[widget]
pub struct TextInput {
    editable: Editable,
}

#[js_methods]
impl TextInput {

    #[js_func]
    pub fn get_text(&self) -> String {
        self.editable.get_text()
    }

    #[js_func]
    pub fn set_text(&mut self, text: String) {
        self.editable.set_text(text);
    }

    #[js_func]
    pub fn set_placeholder(&mut self, placeholder: String) {
        self.editable.set_placeholder(placeholder);
    }

    #[js_func]
    pub fn get_placeholder(&self) -> String {
        self.editable.get_placeholder()
    }

    #[js_func]
    pub fn set_type(&mut self, input_type: InputType) {
        self.editable.set_type(input_type);
        self.el.allow_ime = match input_type {
            InputType::Text => true,
            InputType::Password => false,
        };
    }

    #[js_func]
    pub fn get_type(&self) -> InputType {
        self.editable.get_type()
    }

    #[js_func]
    pub fn create() -> Self {
        let mut element = Element::new("text-input");
        element.allow_ime = true;
        let mut editable = Editable::new();
        editable.set_style(style!("min-width:100%"));
        let mut editable_wrapper = Container::create();
        editable_wrapper.style.set_scroll_thickness(0.0);
        editable_wrapper.set_style(style!("flex-direction:row; width:100%; height:100%; overflow: auto;"));
        editable_wrapper.add_child(&editable, Some(0)).unwrap();

        element.add_child(&editable_wrapper, Some(0)).unwrap();
        //TODO fix focusable
        // editable.element().clone().set_focusable(false);
        element.is_form_element = true;
        element.set_focusable(true);
        
        Self {
            editable,
            el: element,
        }
    }
}

impl Widget for TextInput {}

js_module!(TextInput);

