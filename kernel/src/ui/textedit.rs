use crate as deft;
use crate::edit::editable::Editable;
use crate::{js_module, style};
use crate::ui::{Element, Widget};
use deft_macros::{widget, js_methods};

#[widget]
pub struct TextEdit {
    editable: Editable,
}

#[js_methods]
impl TextEdit {
    
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
    pub fn set_max_history(&mut self, max_history: usize) {
        self.editable.set_max_history(max_history);
    }

    #[js_func]
    pub fn get_max_history(&self) -> usize {
        self.editable.get_max_history()
    }

    #[js_func]
    pub fn get_placeholder(&self) -> String {
        self.editable.get_placeholder()
    }

    #[js_func]
    pub fn set_selection_by_char_offset(&mut self, start: usize, end: usize) {
        self.editable.set_selection_by_char_offset(start, end);
    }

    #[js_func]
    pub fn set_caret_by_char_offset(&mut self, char_offset: usize) {
        self.editable.set_caret_by_char_offset(char_offset);
    }

    #[js_func]
    pub fn create() -> Self {
        let mut element = Element::new("text-edit");
        element.allow_ime = true;
        element.set_focusable(true);
        element.is_form_element = true;
        let mut editable = Editable::new();
        editable.set_style(style!("min-height:2em"));
        element.add_child(&editable, Some(0)).unwrap();
        //TODO fix focusable
        // editable.element().clone().set_focusable(false);
        editable.set_multiple_line(true);

        // {
        //     let mut state = state.clone();
        //     element.register_event_listener(FocusEventListener::new(move |_d, _ctx| {
        //         state.editable.focus();
        //     }));
        // }
        Self {
            el: element,
            editable,
        }
    }
}

impl Widget for TextEdit {

    // fn on_event(&mut self, event: &mut Event, ctx: &mut EventContext<ElementWeak>) {
    //     if ctx.target == self.element {
    //         let eb = self.editable.element().get_bounds();
    //         self.editable.handle_event(event, ctx, (-eb.x, -eb.y));
    //     }
    // }

    // fn execute_default_behavior(
    //     &mut self,
    //     event: &mut Event,
    //     ctx: &mut EventContext<ElementWeak>,
    // ) -> bool {
    //     if ctx.target == self.element {
    //         return self.editable.on_execute_default_behavior(event);
    //     }
    //     false
    // }
}

js_module!(TextEdit);
