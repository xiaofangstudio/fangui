use crate as deft;
use std::collections::HashMap;
use deft_macros::mrc_object;
use crate::canvas_util::CanvasHelper;
use crate::image::image_object::ImageObject;
use crate::ui::container::Container;
use crate::ui::{ElementDelegate, ElementWeak};
use crate::ui::label::Label;
use crate::ui::select::{ChangeEvent, SelectOption};
use crate::event::ClickEventListener;
use crate::ok_or_return;
use crate::render::RenderFn;
use crate::style::{FixedStyleProp, ResolvedStyleProp};
use crate::style::computed_style::{BasicComputedStyle, ComputedStyle};
use crate::style::listener::LayoutListener;
use crate::style::parsed_styles::ParsedStyles;
use crate::text::textbox::TextBox;

#[mrc_object]
pub struct SelectDelegate {
    pub element_weak: ElementWeak,
    pub placeholder: TextBox,
    pub select_img: ImageObject,
    pub options_style: Vec<FixedStyleProp>,
    pub option_style: Vec<FixedStyleProp>,
    pub option_hover_style: Vec<FixedStyleProp>,
    pub label: Label,
    pub value: String,
    pub options: Vec<SelectOption>,
}

impl SelectDelegate {
    pub fn set_value(&mut self, value: String) {
        if self.value != value {
            let label = self
                .options
                .iter()
                .find(|o| o.value == value)
                .map(|it| &it.label)
                .unwrap_or(&value)
                .to_string();
            self.label.set_text(label);
            self.value = value;
            self.element_weak.emit(ChangeEvent {});
        }
    }

    pub fn build_options_element<F: FnOnce(String) + Clone + 'static>(
        &self,
        value_setter: F,
    ) -> Container {
        let mut wrapper = Container::create();
        wrapper.set_style_props(self.options_style.clone());
        for option in &self.options {
            let mut label_el = Label::create();
            label_el.set_style_props(self.option_style.clone());
            label_el.set_hover_style(ParsedStyles::from_fixed(self.option_hover_style.clone()));
            let setter = value_setter.clone();
            let value = option.clone();
            label_el.register_event_listener(ClickEventListener::new(move |_e, _ctx| {
                (setter.clone())(value.value.clone());
            }));
            label_el.set_text(option.label.clone());
            wrapper
                .add_child(&label_el, None)
                .unwrap();
        }
        wrapper
    }
}

impl ElementDelegate for SelectDelegate {

    fn render(&mut self) -> RenderFn {
        let element_weak = self.element_weak.clone();
        let el = ok_or_return!(element_weak.upgrade(), RenderFn::empty());
        let bounds = el.get_computed_style().bounds();
        let (img_width, img_height) = self.select_img.get_container_size();
        let y = (bounds.height - img_height) / 2.0;
        let x = bounds.width - img_width - y;
        let mut img = self.select_img.render();
        let mut placeholder_renderer = if self.label.get_text().is_empty() {
            Some(self.placeholder.render())
        } else {
            None
        };
        let (pt, _, _, pl) = el.get_computed_style().padding();
        RenderFn::new(move |painter| {
            if let Some(pr) = &mut placeholder_renderer {
                painter.canvas.session(|c| {
                    c.translate((pl, pt));
                    pr.run(painter);
                });
            }
            painter.canvas.translate((x, y));
            img.run(painter);
        })
    }

    fn accept_pseudo_element_styles(&mut self, styles: HashMap<String, Vec<ResolvedStyleProp>>) {
        if let Some(styles) = styles.get("options") {
            let styles: Vec<FixedStyleProp> = styles.iter().map(|it| it.to_unresolved()).collect();
            self.options_style = styles;
        }
        if let Some(styles) = styles.get("option") {
            let styles: Vec<FixedStyleProp> = styles.iter().map(|it| it.to_unresolved()).collect();
            self.option_style = styles;
        }
        if let Some(styles) = styles.get("option-hover") {
            let styles: Vec<FixedStyleProp> = styles.iter().map(|it| it.to_unresolved()).collect();
            self.option_hover_style = styles;
        }
        if let Some(placeholder_styles) = styles.get("placeholder") {
            for style in placeholder_styles {
                match style {
                    ResolvedStyleProp::Color(color) => {
                        self.placeholder.set_color(*color);
                        self.placeholder.layout();
                    }
                    _ => {}
                }
            }
        }
    }

}

impl LayoutListener for SelectDelegate {
    fn after_style_resolved(&mut self, base_style: &BasicComputedStyle) {
        self.select_img.set_color(base_style.color);
    }

    fn after_layout(&mut self, style: &ComputedStyle) {
        let height = style.bounds().height - 4.0;
        self.select_img.set_container_size((height, height));
        self.placeholder.set_line_height(style.line_height());
        self.placeholder.layout();
    }
}