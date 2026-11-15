mod delegate;

use std::sync::{Arc, Mutex};
use crate as deft;
use crate::js_module;
use crate::image::image_object::ImageObject;
use crate::ui::{Element, Widget};
use deft_macros::{widget, js_methods};
use crate::ui::image::delegate::ImageDelegate;

#[widget]
pub struct Image {
    src: String,
    img: Arc<Mutex<ImageObject>>,
}

impl Widget for Image {}

js_module!(Image);

#[js_methods]
impl Image {

    #[js_func]
    pub fn set_src(&mut self, src: String) {
        self.update_img(ImageObject::new(&src));
    }

    pub fn set_src_svg_raw(&mut self, svg: &[u8]) {
        self.update_img(ImageObject::from_svg_bytes(svg));
    }

    fn update_img(&mut self, mut img: ImageObject) {
        img.set_color(self.el.style.computed.color());
        *self.img.lock().unwrap() = img;
        self.el.style.make_layout_dirty();
    }

    #[js_func]
    pub fn create() -> Self {
        let element = Element::new("image");
        let mut img = Self {
            el: element,
            src: "".to_string(),
            img: Arc::new(Mutex::new(ImageObject::none())),
        };
        let element = img.el.as_weak();
        let img2 = img.img.clone();
        let delegate = ImageDelegate {
            element,
            img: img2,
        };
        img.el.set_layout_listener(delegate.clone());
        img.el.style.set_layout_measurer(delegate.clone());
        img.el.set_delegate(delegate);
        img
    }
}
