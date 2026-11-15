
use crate as deft;
use crate::base::Size;
use crate::ui::{ElementDelegate, ElementWeak};
use crate::ok_or_return;
use crate::render::RenderFn;
use crate::text::textbox::{TextBox, TextElement, TextUnit};
use deft_macros::mrc_object;
use crate::event::TextUpdateEvent;
use crate::style::computed_style::{BasicComputedStyle, ComputedStyle};
use crate::style::listener::LayoutListener;
use crate::style::measure::LayoutMeasurer;
use crate::style::node_item::MeasureParams;

#[mrc_object]
pub struct LabelDelegate {
    pub element: ElementWeak,
    pub text_box: TextBox,
    pub text: String,
    pub measure_called: bool,
    pub last_layout_width: Option<f32>,
}

impl LabelDelegate {

    pub fn new(ew: ElementWeak) -> Self {
        let mut delegate = LabelDelegateData {
            text_box: TextBox::new(),
            measure_called: false,
            last_layout_width: None,
            element: ew,
            text: "".to_string(),
        }.to_ref();
        let weak = delegate.as_weak();
        delegate.text_box.set_layout_callback(move |_has_text| {
            let mut me = ok_or_return!(weak.upgrade());
            me.make_layout_invalid();
        });
        delegate
    }

    pub fn set_text(&mut self, text: &str) {
        if self.text != text {
            self.text = text.to_string();
            self.text_box.clear();
            let text_unit = self.build_text_unit(text.to_string());
            self.text_box.add_line(vec![TextElement::Text(text_unit)]);
            self.element.emit(TextUpdateEvent { value: text.to_string() })
        }
    }

    fn make_layout_invalid(&mut self) {
        self.last_layout_width = None;
        let mut el = ok_or_return!(self.element.upgrade());
        el.style.make_layout_dirty();
    }

    fn build_text_unit(&self, text: String) -> TextUnit {
        TextUnit {
            text,
            font_families: None,
            font_size: None,
            color: None,
            text_decoration_line: None,
            weight: None,
            background_color: None,
            style: None,
        }
    }

    fn do_layout(&mut self, width: f32) {
        if self.last_layout_width == Some(width) {
            return;
        }

        self.text_box.set_layout_width(width);
        self.text_box.layout();
        self.last_layout_width = Some(width);
    }

}

impl ElementDelegate for LabelDelegate {

    fn render(&mut self) -> RenderFn {
        let el = ok_or_return!(self.element.upgrade(), RenderFn::empty());
        let (pt, _, _, pl) = el.get_computed_style().padding();
        let mut text_renderer = self.text_box.render();
        RenderFn::new(move |painter| {
            painter.canvas.translate((pl, pt));
            text_renderer.run(painter);
        })
    }

}

impl LayoutListener for LabelDelegate {
    fn after_style_resolved(&mut self, bs: &BasicComputedStyle) {
        self.text_box.set_color(bs.color);
        self.text_box.set_font_size(bs.font_size);
        self.text_box.set_font_families(bs.font_family.clone());
        self.text_box.set_font_weight(bs.font_weight);
        self.text_box.set_font_style(bs.font_style);
        self.text_box.set_line_height(bs.line_height);
    }

    fn before_layout(&mut self) {
        self.measure_called = false;
    }

    fn after_layout(&mut self, style: &ComputedStyle) {
        if !self.measure_called {
            self.do_layout(style.bounds().width);
        }
    }

}

impl LayoutMeasurer for LabelDelegate {
    fn measure_layout(&mut self, params: MeasureParams) -> Size {
        self.measure_called = true;
        self.do_layout(params.width);
        let width = self.text_box.max_intrinsic_width();
        let height = self.text_box.height();
        // log::debug!("text measure params:{}x{}", params.width, params.height);
        // log::debug!("text measure result:{}x{}, {}", width, height, state.text_box.get_text());
        Size { width, height }
    }
}