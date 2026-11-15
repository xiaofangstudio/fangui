use skia_safe::{Color, Image};
use skia_safe::font_style::Weight;
use crate::base::Rect;
use crate::font::family::FontFamilies;
use crate::style::font::FontStyle;
use crate::style::transform::StyleTransform;

//TODO rename to Layout
#[derive(Default, Clone)]
pub struct LayoutInfo {
    pub border_width: (f32, f32, f32, f32),
    pub padding: (f32, f32, f32, f32),
    pub bounds: Rect,
}

#[derive(Clone)]
pub struct BasicComputedStyle {
    pub size: (f32, f32),
    pub border_radius: [f32; 4],
    pub border_color: [Color; 4],
    pub background_image: Option<Image>,
    pub font_size: f32,
    pub color: Color,
    pub background_color: Color,
    pub font_family: FontFamilies,
    pub font_weight: Weight,
    pub font_style: FontStyle,
    pub transform: Option<StyleTransform>,
    pub line_height: f32,
}

#[derive(Clone)]
pub struct ComputedStyle {
    pub(crate) basic: BasicComputedStyle,
    pub(crate) layout: LayoutInfo,
}

impl ComputedStyle {
    pub fn size(&self) -> (f32, f32) {
        self.basic.size
    }

    pub fn border_radius(&self) -> [f32; 4] {
        self.basic.border_radius
    }

    pub fn border_color(&self) -> [Color; 4] {
        self.basic.border_color
    }

    pub fn background_image(&self) -> Option<&Image> {
        self.basic.background_image.as_ref()
    }

    pub fn font_size(&self) -> f32 {
        self.basic.font_size
    }

    pub fn color(&self) -> Color {
        self.basic.color
    }

    pub fn background_color(&self) -> Color {
        self.basic.background_color
    }

    pub fn font_family(&self) -> &FontFamilies {
        &self.basic.font_family
    }

    pub fn font_weight(&self) -> Weight {
        self.basic.font_weight
    }

    pub fn font_style(&self) -> &FontStyle {
        &self.basic.font_style
    }

    pub fn transform(&self) -> Option<&StyleTransform> {
        self.basic.transform.as_ref()
    }

    pub fn line_height(&self) -> f32 {
        self.basic.line_height
    }

    pub fn border_width(&self) -> (f32, f32, f32, f32) {
        self.layout.border_width
    }

    pub fn padding(&self) -> (f32, f32, f32, f32) {
        self.layout.padding
    }

    pub fn bounds(&self) -> Rect {
        self.layout.bounds
    }

    pub fn content_bounds(&self) -> Rect {
        let (t, r, b, l) = self.padding();
        let (bt, br, bb, bl) = self.border_width();
        let width = self.layout.bounds.width;
        let height = self.layout.bounds.height;
        Rect::new(
            l + bl,
            t + bt,
            width - l - r - bl - br,
            height - t - b - bt - bb,
        )
    }

}
