use crate as deft;
use std::collections::HashMap;
use deft_macros::mrc_object;
use crate::base::Callback;
use crate::style::{FixedStyleProp, ResolvedStyleProp, StylePropKey};

pub trait StyleListener {
    fn request_next_frame_callback(&mut self, callback: Callback);
    fn update_animation_styles(&mut self, styles: HashMap<StylePropKey, FixedStyleProp>);
    // fn on_dirty(&mut self, layout_dirty: bool);
    fn accept_pseudo_element_styles(&mut self, styles: HashMap<String, Vec<ResolvedStyleProp>>);

    fn request_repaint(&mut self);
}

struct NoopStyleListener {

}

impl StyleListener for NoopStyleListener {
    fn request_next_frame_callback(&mut self, _callback: Callback) {

    }

    fn update_animation_styles(&mut self, _styles: HashMap<StylePropKey, FixedStyleProp>) {

    }

    fn accept_pseudo_element_styles(&mut self, _styles: HashMap<String, Vec<ResolvedStyleProp>>) {

    }

    fn request_repaint(&mut self) {

    }
}

#[mrc_object]
pub struct BoxedStyleListener {
    listener: Box<dyn StyleListener>,
}

impl BoxedStyleListener {

    pub fn new<F: StyleListener + 'static>(listener: F) -> Self {
        BoxedStyleListenerData {
            listener: Box::new(listener)
        }.to_ref()
    }

    pub fn new_noop() -> Self {
        Self::new(NoopStyleListener {})
    }

    pub fn request_next_frame_callback(&mut self, callback: Callback) {
        self.listener.request_next_frame_callback(callback)
    }
    pub fn update_animation_styles(&mut self, styles: HashMap<StylePropKey, FixedStyleProp>) {
        self.listener.update_animation_styles(styles)
    }

    pub fn request_repaint(&mut self) {
        self.listener.request_repaint();
    }

    pub fn accept_pseudo_element_styles(&mut self, styles: HashMap<String, Vec<ResolvedStyleProp>>) {
        self.listener.accept_pseudo_element_styles(styles);
    }
}