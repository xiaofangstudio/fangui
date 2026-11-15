use crate::style::computed_style::{BasicComputedStyle, ComputedStyle};

pub trait LayoutListener {

    fn after_style_resolved(&mut self, base_style: &BasicComputedStyle) {
        let _ = base_style;
    }

    fn before_layout(&mut self) {}

    fn after_layout(&mut self, style: &ComputedStyle) {
        let _ = style;
    }

}

pub struct EmptyLayoutListener {
    
}

impl LayoutListener for EmptyLayoutListener {}