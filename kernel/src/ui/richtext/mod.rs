mod delegate;

use crate as deft;
use crate::ui::{Element, Widget};
use crate::{js_module, ok_or_return};
use crate::text::textbox::{TextBox, TextCoord, TextElement};
use deft_macros::{widget, js_methods};
use crate::ui::richtext::delegate::{RichTextDelegate, RichTextDelegateData};

#[widget]
pub struct RichText {
    delegate: RichTextDelegate,
}

impl Widget for RichText {}

js_module!(RichText);

#[js_methods]
impl RichText {
    #[js_func]
    pub fn add_line(&mut self, units: Vec<TextElement>) {
        self.delegate.text_box.add_line(units);
    }

    #[js_func]
    pub fn insert_line(&mut self, index: usize, units: Vec<TextElement>) {
        self.delegate.text_box.insert_line(index, units);
    }

    #[js_func]
    pub fn delete_line(&mut self, line: usize) {
        self.delegate.text_box.delete_line(line);
    }

    #[js_func]
    pub fn update_line(&mut self, index: usize, units: Vec<TextElement>) {
        self.delegate.text_box.update_line(index, units);
    }

    pub fn get_line(&self, row: usize) -> Option<&Vec<TextElement>> {
        self.delegate.text_box.get_lines().get(row).map(|ln| &ln.units)
    }

    #[js_func]
    pub fn clear(&mut self) {
        self.delegate.text_box.clear();
    }

    #[js_func]
    pub fn measure_line(&self, units: Vec<TextElement>) -> (f32, f32) {
        self.delegate.text_box.measure_line(units)
    }

    #[js_func]
    pub fn get_text_coord_by_char_offset(&self, caret: usize) -> Option<TextCoord> {
        self.delegate.text_box.get_text_coord_by_char_offset(caret)
    }

    #[js_func]
    pub fn get_selection_text(&self) -> Option<String> {
        self.delegate.text_box.get_selection_text()
    }

    pub fn get_text(&self) -> String {
        self.delegate.text_box.get_text()
    }

    #[js_func]
    pub fn create() -> Self {
        let mut element = Element::new("rich-text");
        let mut text_box = TextBox::new();
        {
            let el = element.as_weak();
            text_box.set_repaint_callback(move || {
                let mut el = ok_or_return!(el.upgrade());
                el.request_repaint();
            });
        }
        {
            let el = element.as_weak();
            text_box.set_layout_callback(move |_has_text| {
                el.make_layout_dirty();
            });
        }
        text_box.bind_event(&mut element);
        let delegate = RichTextDelegateData {
            element: element.as_weak(),
            text_box: text_box.clone(),
        }.to_ref();
        element.set_delegate(delegate.clone());
        element.set_layout_listener(delegate.clone());
        let mut this = Self {
            el: element,
            delegate,
        };
        this.el.style.set_layout_measurer(this.delegate.clone());
        this
    }
}

