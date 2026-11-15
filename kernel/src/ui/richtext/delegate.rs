use crate as deft;
use deft_macros::mrc_object;
use crate::base::Size;
use crate::ui::{ElementDelegate, ElementWeak};
use crate::render::RenderFn;
use crate::style::computed_style::BasicComputedStyle;
use crate::style::listener::LayoutListener;
use crate::style::measure::LayoutMeasurer;
use crate::style::node_item::MeasureParams;
use crate::text::textbox::TextBox;

#[mrc_object]
pub struct RichTextDelegate {
    pub element: ElementWeak,
    pub text_box: TextBox,
}

impl ElementDelegate for RichTextDelegate {
    fn render(&mut self) -> RenderFn {
        self.text_box.render()
    }
}

impl LayoutListener for RichTextDelegate {
    fn after_style_resolved(&mut self, base_style: &BasicComputedStyle) {
        self.text_box.set_color(base_style.color);
        self.text_box.set_font_size(base_style.font_size);
        self.text_box.set_font_families(base_style.font_family.clone());
        self.text_box.set_font_weight(base_style.font_weight);
        self.text_box.set_font_style(base_style.font_style.clone());
        self.text_box.set_line_height(base_style.line_height);
    }
}

impl LayoutMeasurer for RichTextDelegate {
    fn measure_layout(&mut self, params: MeasureParams) -> Size {
        self.text_box.set_layout_width(params.width);
        self.text_box.layout();
        Size {
            width: self.text_box.max_intrinsic_width(),
            height: self.text_box.height(),
        }
    }
}