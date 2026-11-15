use std::collections::HashMap;
use crate::animation::actor::AnimationActor;
use crate::animation::Animation;
use crate::ok_or_return;
use crate::style::style_listener::BoxedStyleListener;
use crate::style::StyleNodeWeak;

pub struct CssAnimationActor {
    animation: Animation,
    listener: BoxedStyleListener,
    style_node: StyleNodeWeak,
}

impl CssAnimationActor {
    pub fn new(style_node: StyleNodeWeak, animation: Animation, listener: BoxedStyleListener) -> Self {
        Self {style_node, animation, listener }
    }
}

impl AnimationActor for CssAnimationActor {
    fn apply_animation(&mut self, position: f32, _stop: &mut bool) {
        let mut animation_style_props = HashMap::new();
        let styles = self.animation.get_frame(position);
        for st in styles {
            animation_style_props.insert(st.key().clone(), st);
        }
        self.listener.update_animation_styles(animation_style_props);
        let mut style_node = ok_or_return!(self.style_node.upgrade());
        style_node.make_style_dirty();
    }

    fn stop(&mut self) {
        self.listener.update_animation_styles(HashMap::new());
        let mut style_node = ok_or_return!(self.style_node.upgrade());
        style_node.make_style_dirty();
    }
}
