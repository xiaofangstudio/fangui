use std::sync::{Arc, Mutex};
use crate::base::Size;
use crate::image::image_object::ImageObject;
use crate::ui::{ElementDelegate, ElementWeak};
use crate::render::RenderFn;
use crate::style::computed_style::{BasicComputedStyle, ComputedStyle};
use crate::style::listener::LayoutListener;
use crate::style::measure::LayoutMeasurer;
use crate::style::node_item::MeasureParams;

#[derive(Clone)]
pub struct ImageDelegate {
    pub element: ElementWeak,
    pub img: Arc<Mutex<ImageObject>>,
}

impl ElementDelegate for ImageDelegate {
    fn render(&mut self) -> RenderFn {
        self.img.lock().unwrap().render()
    }

}

impl LayoutListener for ImageDelegate {
    fn after_style_resolved(&mut self, base_style: &BasicComputedStyle) {
        let mut img = self.img.lock().unwrap();
        img.set_color(base_style.color);
    }
    
    fn after_layout(&mut self, style: &ComputedStyle) {
        let bounds = style.content_bounds();
        self.img.lock().unwrap().set_container_size((bounds.width, bounds.height));
    }
}

impl LayoutMeasurer for ImageDelegate {
    fn measure_layout(&mut self, _params: MeasureParams) -> Size {
        let (width, height) = self.img.lock().unwrap().get_size();
        Size { width, height }
    }
}