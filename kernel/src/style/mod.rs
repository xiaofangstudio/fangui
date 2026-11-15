pub mod animation;
pub mod border;
pub mod border_path;
pub mod color;
pub mod css_manager;
pub mod flex;
pub mod font;
pub mod length;
pub mod node_item;
pub mod overflow;
mod select;
pub mod style_vars;
pub mod styles;
pub mod transform;
pub mod var_expr;
pub mod style_list;
pub mod stylesheet;
pub mod listener;
pub mod parsed_styles;
pub mod style_listener;
pub mod measure;
pub mod computed_style;

use crate as deft;
use crate::animation::css_actor::CssAnimationActor;
use crate::animation::ANIMATIONS;
use crate::animation::{AnimationInstance, WindowAnimationController};
use crate::base::{Rect};
use crate::ui::scroll::ScrollBarStrategy;
use crate::event_loop::create_event_loop_callback;
use crate::font::family::FontFamilies;
use crate::mrc::{Mrc};
use crate::style::animation::AnimationParams;
use crate::style::font::{FontStyle, LineHeightVal};
use crate::style::length::{Length, LengthContext, LengthOrPercent};
use crate::style::node_item::{NodeItem};
use crate::style::overflow::Overflow;
use crate::style::style_vars::StyleVars;
use crate::style::transform::StyleTransform;
use anyhow::{anyhow, Error};
use deft_macros::mrc_object;
use quick_js::JsValue;
use skia_safe::font_style::Weight;
use skia_safe::{Color, Matrix};
use std::collections::HashMap;
use std::ops::{Deref, DerefMut};
use std::str::FromStr;
use bitflags::{bitflags};
use yoga::{Align, Direction, Display, FlexDirection, Justify, Layout, Node, PositionType, Size, StyleUnit, Wrap};
use crate::base;
use crate::style::computed_style::{BasicComputedStyle, ComputedStyle, LayoutInfo};
use crate::style::listener::{EmptyLayoutListener, LayoutListener};
use crate::style::measure::LayoutMeasurer;
use crate::style::parsed_styles::ParsedStyles;
use crate::style::style_list::{ParsedStyleProp, StyleList};
use crate::style::style_listener::BoxedStyleListener;
use crate::style::styles::Styles;
use crate::ui::common::scrollable::Scrollable;

//TODO rename
pub trait PropValueParse: Sized {
    fn parse_prop_value(value: &str) -> Option<Self>;
    fn to_style_string(&self) -> String;
}

impl PropValueParse for f32 {
    fn parse_prop_value(value: &str) -> Option<Self> {
        f32::from_str(value).ok()
    }
    fn to_style_string(&self) -> String {
        self.to_string()
    }
}

impl PropValueParse for String {
    fn parse_prop_value(value: &str) -> Option<Self> {
        Some(value.to_string())
    }
    fn to_style_string(&self) -> String {
        self.to_string()
    }
}

#[derive(Clone, Debug, PartialEq)]
pub enum StylePropVal<T: PropValueParse> {
    Custom(T),
    Inherit,
    Unset,
}

impl<T: Clone + PropValueParse> StylePropVal<T> {
    pub fn to_style_string(&self) -> String {
        match self {
            StylePropVal::Custom(v) => v.to_style_string(),
            StylePropVal::Inherit => "inherit".to_string(),
            StylePropVal::Unset => "unset".to_string(),
        }
    }
}

macro_rules! define_style_props {
    ($($name: ident => $type: ty, $compute_type: ty; )*) => {
        #[derive(Clone, Debug, PartialEq)]
        pub enum FixedStyleProp {
            $(
                $name(StylePropVal<$type>),
            )*
        }

        #[derive(Clone, Debug, PartialEq)]
        pub enum ResolvedStyleProp {
            $(
                $name($type),
            )*
        }

        impl ResolvedStyleProp {
             pub fn key(&self) -> StylePropKey {
                match self {
                    $(
                        Self::$name(_) => StylePropKey::$name,
                    )*
                }
            }

            pub fn to_unresolved(&self) -> FixedStyleProp {
                 match self {
                    $(
                        Self::$name(v) => FixedStyleProp::$name(StylePropVal::Custom(v.clone())),
                    )*
                }
             }
        }

        #[derive(Clone, Hash, PartialEq, Eq, Copy, Debug)]
        pub enum StylePropKey {
            $(
                $name,
            )*
        }

        impl StylePropKey {
            pub fn parse(key: &str) -> Option<Self> {
                $(
                    if key.to_lowercase() == stringify!($name).to_lowercase() {
                        return Some(StylePropKey::$name);
                    }
                )*
                None
            }
            pub fn name(&self) -> &str {
                match self {
                    $(
                        Self::$name => stringify!($name),
                    )*
                }
            }
        }

        impl FixedStyleProp {
            pub fn parse_value(key: StylePropKey, value: &str) -> Option<FixedStyleProp> {
                $(
                    if key == StylePropKey::$name {
                        return <$type>::parse_prop_value(value).map(|v| FixedStyleProp::$name(StylePropVal::Custom(v)));
                    }
                )*
                return None
            }
            pub fn parse(key: &str, value: &str) -> Option<FixedStyleProp> {
                let key = key.to_lowercase();
                let k = key.as_str();
                $(
                    if k == stringify!($name).to_lowercase().as_str() {
                        let value_lowercase = value.to_lowercase();
                        let value_lowercase = value_lowercase.as_str();
                        if value_lowercase == "inherit" {
                            return Some(FixedStyleProp::$name(StylePropVal::Inherit));
                        } else if value_lowercase == "unset" {
                            return Some(FixedStyleProp::$name(StylePropVal::Unset));
                        } else {
                            return <$type>::parse_prop_value(value).map(|v| FixedStyleProp::$name(StylePropVal::Custom(v)));
                        }
                    }
                )*
                return None
            }
            pub fn name(&self) -> &str {
                match self {
                    $(
                        Self::$name(_) => stringify!($name),
                    )*
                }
            }
            pub fn key(&self) -> StylePropKey {
                match self {
                    $(
                        Self::$name(_) => StylePropKey::$name,
                    )*
                }
            }
            pub fn unset(&self) -> Self {
                match self {
                    $(
                       Self::$name(_) => Self::$name(StylePropVal::Unset),
                    )*
                }
            }

            pub fn is_inherited(&self) -> bool {
                match self {
                    $(
                       Self::$name(v) => *v == StylePropVal::Inherit,
                    )*
                }
            }

            pub fn to_style_string(&self) -> String {
                match self {
                    $(
                       Self::$name(v) => v.to_style_string(),
                    )*
                }
            }

            pub fn resolve_value<
                D: Fn(StylePropKey) -> ResolvedStyleProp,
                P: Fn(StylePropKey) -> ResolvedStyleProp
            >(
                &self,
                default_value: D,
                parent_value: P,
            ) -> ResolvedStyleProp {
                match self {
                    $(
                        Self::$name(v) => {
                            match v {
                                StylePropVal::Custom(v) => { ResolvedStyleProp::$name(v.clone()) }
                                StylePropVal::Unset => {
                                    default_value(self.key())
                                }
                                StylePropVal::Inherit => {
                                    parent_value(self.key())
                                }
                            }
                        },
                    )*
                }
            }
        }
    };
}

define_style_props!(
    Color => Color, Color;
    BackgroundColor => Color, Color;
    FontSize        => Length, f32;
    FontFamily      => FontFamilies, FontFamilies;
    FontWeight      => Weight, Weight;
    FontStyle       => FontStyle, Style;
    LineHeight      => LineHeightVal, f32;

    BorderTopWidth => LengthOrPercent, f32;
    BorderRightWidth => LengthOrPercent, f32;
    BorderBottomWidth => LengthOrPercent, f32;
    BorderLeftWidth => LengthOrPercent, f32;

    BorderTopColor => Color, Color;
    BorderRightColor => Color, Color;
    BorderBottomColor => Color, Color;
    BorderLeftColor => Color, Color;

    Display => Display, Display;

    Width => LengthOrPercent, StyleUnit;
    Height => LengthOrPercent, StyleUnit;
    MaxWidth => LengthOrPercent, StyleUnit;
    MaxHeight => LengthOrPercent, StyleUnit;
    MinWidth => LengthOrPercent, StyleUnit;
    MinHeight => LengthOrPercent, StyleUnit;

    MarginTop => LengthOrPercent, StyleUnit;
    MarginRight => LengthOrPercent, StyleUnit;
    MarginBottom => LengthOrPercent, StyleUnit;
    MarginLeft => LengthOrPercent, StyleUnit;

    PaddingTop => LengthOrPercent, StyleUnit;
    PaddingRight => LengthOrPercent, StyleUnit;
    PaddingBottom => LengthOrPercent, StyleUnit;
    PaddingLeft => LengthOrPercent, StyleUnit;
    //
    Flex => f32, f32;
    FlexBasis => LengthOrPercent, StyleUnit;
    FlexGrow => f32, f32;
    FlexShrink => f32, f32;
    AlignSelf => Align, Align;
    Direction => Direction, Direction;
    Position => PositionType, PositionType;
    Overflow => Overflow, Overflow;

    BorderTopLeftRadius => Length, Length;
    BorderTopRightRadius => Length, Length;
    BorderBottomRightRadius => Length, Length;
    BorderBottomLeftRadius => Length, Length;

    JustifyContent => Justify, Justify;
    FlexDirection => FlexDirection, FlexDirection;
    AlignContent => Align, Align;
    AlignItems => Align, Align;
    FlexWrap => Wrap, Wrap;
    ColumnGap => Length, f32;
    RowGap => Length, f32;

    Top => LengthOrPercent, StyleUnit;
    Right => LengthOrPercent, StyleUnit;
    Bottom => LengthOrPercent, StyleUnit;
    Left => LengthOrPercent, StyleUnit;

    Transform => StyleTransform, StyleTransform;
    AnimationName => String, String;
    AnimationDuration => f32, f32;
    AnimationIterationCount => f32, f32;
);

pub fn parse_box_prop(str: &str, default: &str) -> (String, String, String, String) {
    let parts: Vec<&str> = str.split(" ").filter(|e| !e.is_empty()).collect();
    let top = if let Some(v) = parts.get(0) {
        v
    } else {
        default
    };
    let right = if let Some(v) = parts.get(1) { v } else { top };
    let bottom = if let Some(v) = parts.get(2) { v } else { top };
    let left = if let Some(v) = parts.get(3) { v } else { right };
    (
        top.to_string(),
        right.to_string(),
        bottom.to_string(),
        left.to_string(),
    )
}

#[derive(PartialEq, Clone)]
pub struct YogaNode {
    node: Mrc<Node>,
}

impl YogaNode {
    pub fn new() -> Self {
        Self {
            node: Mrc::new(Node::new()),
        }
    }
}

impl Deref for YogaNode {
    type Target = Node;

    fn deref(&self) -> &Self::Target {
        &self.node
    }
}

impl DerefMut for YogaNode {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.node
    }
}

bitflags! {
    /// Multiple decorations can be applied at once. Ex: Underline and overline is
    /// (0x1 | 0x2)
    #[derive(Debug, Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
    struct DirtyFlag: u32 {
        const StyleDirty = 1;
        const LayoutDirty = 2;
    }
}


#[mrc_object]
pub struct StyleNode {
    dirty_flag: DirtyFlag,
    style_list: StyleList,
    yoga_node: NodeItem,
    children: Vec<StyleNode>,
    pub(crate) computed: ComputedStyle,
    pub(crate) listener: Box<dyn LayoutListener>,
    children_decoration: (f32, f32, f32, f32),

    animation_params: AnimationParams,
    animation_instance: Option<AnimationInstance>,
    resolved_style_props: HashMap<StylePropKey, ResolvedStyleProp>,
    pub scrollable: Mrc<Scrollable>,
    pub(super) animation_style_props: HashMap<StylePropKey, FixedStyleProp>,
    applied_style: Styles,
    applied_pseudo_element_styles: HashMap<String, Styles>,
    //TODO rename
    pub need_snapshot: bool,
    hover: bool,
    parent: Option<StyleNodeWeak>,
    style_listener: BoxedStyleListener,
}

impl StyleNode {
    pub fn new() -> Self {
        let transparent = Color::from_argb(0, 0, 0, 0);
        let scrollable = Scrollable::new();
        let mut inner = StyleNodeData {
            dirty_flag: DirtyFlag::all(),
            style_list: StyleList::new(),
            animation_style_props: HashMap::new(),
            yoga_node: NodeItem::new(),
            children: Vec::new(),
            computed: ComputedStyle {
                basic: BasicComputedStyle {
                    size: (0.0, 0.0),
                    border_radius: [0.0, 0.0, 0.0, 0.0],
                    border_color: [transparent, transparent, transparent, transparent],
                    background_image: None,
                    font_size: 12.0,
                    color: Color::new(0),
                    background_color: Color::new(0),
                    font_family: FontFamilies::default(),
                    font_weight: Weight::NORMAL,
                    font_style: FontStyle::Normal,
                    transform: None,
                    line_height: 12.0 * 1.2,
                },
                layout: LayoutInfo::default(),
            },

            animation_instance: None,
            animation_params: AnimationParams::new(),
            resolved_style_props: HashMap::new(),
            scrollable: Mrc::new(scrollable),
            listener: Box::new(EmptyLayoutListener {}),
            children_decoration: (0.0, 0.0, 0.0, 0.0),
            applied_style: Styles::new(),
            applied_pseudo_element_styles: HashMap::new(),
            need_snapshot: false,
            hover: false,
            parent: None,
            style_listener: BoxedStyleListener::new_noop()
        };
        inner.yoga_node.position_type = PositionType::Static;
        inner.to_ref()
    }

    pub fn is_style_dirty(&self) -> bool {
        self.dirty_flag.contains(DirtyFlag::StyleDirty)
    }

    pub fn is_layout_dirty(&self) -> bool {
        self.dirty_flag.contains(DirtyFlag::LayoutDirty)
    }
    
    pub fn set_hover(&mut self, value: bool) {
        self.hover = value;
        if self.has_hover_style() {
            self.make_style_dirty();
        }
    }
    
    pub fn get_hover(&self) -> bool {
        self.hover
    }

    pub fn make_style_dirty(&mut self) {
        self.mark_tree_dirty(DirtyFlag::StyleDirty);
    }

    pub fn make_layout_dirty(&mut self) {
        self.mark_tree_dirty(DirtyFlag::LayoutDirty);
    }

    fn mark_tree_dirty(&mut self, flag: DirtyFlag) {
        if self.dirty_flag.contains(flag) {
            return;
        }
        fn mark_children_dirty(root: &mut StyleNode, flag: DirtyFlag) {
            for child in root.children.iter_mut() {
                child.mark_dirty_flag_recursively(flag);
            }
        }
        if self.has_shadow() {
            mark_children_dirty(self, flag);
            match self.get_parent() {
                Some(mut p) => p.make_style_dirty(),
                None => {
                    self.dirty_flag.insert(flag);
                }
            }
        } else {
            let mut root = self.get_tree_root();
            if !root.has_shadow() {
                root.dirty_flag.insert(flag);
            }
            mark_children_dirty(&mut root, flag);
        }
        self.style_listener.request_repaint();
    }

    fn mark_dirty_flag_recursively(&mut self, flag: DirtyFlag) {
        if self.dirty_flag.contains(flag) {
            return;
        }
        self.dirty_flag.insert(flag);
        for child in &mut self.children {
            child.mark_dirty_flag_recursively(flag);
        }
    }

    fn get_tree_root(&self) -> StyleNode {
        if self.yoga_node.is_layout_boundary() {
            self.clone()
        } else if let Some(p) = self.get_parent() {
            p.get_tree_root()
        } else {
            self.clone()
        }
    }

    fn get_parent(&self) -> Option<StyleNodeRefMut<'_>> {
        if let Some(p) = &self.parent {
            p.upgrade().ok()
        } else {
            None
        }
    }

    pub(crate) fn apply_style_update_in_tree(elements: &mut Vec<Self>, length_ctx: &LengthContext) {
        for child in elements.iter_mut() {
            child.apply_owned_style(length_ctx);
            if !child.has_shadow() {
                Self::apply_style_update_in_tree(&mut child.children, length_ctx);
            }
        }
    }

    fn apply_owned_style(&mut self, length_ctx: &LengthContext) -> bool {
        let parent_style = self.get_parent().map(|s| s.clone());
        let hover = self.hover;

        let (mut changed, changed_pe_styles_map) = self.apply(hover, &parent_style, length_ctx);

        if !changed_pe_styles_map.is_empty() {
            self.style_listener.accept_pseudo_element_styles(changed_pe_styles_map);
            changed = true;
        }
        // println!("changed list: {} {:?}", self.id, changed_list);
        changed
    }

    pub fn has_shadow(&self) -> bool {
        self.yoga_node.is_layout_boundary()
    }

    pub fn build(&mut self) {
        //TODO release layout
        if self.has_shadow() {
            self.yoga_node.build_shadow_yn();
        } else {
            self.yoga_node.build_yn();
        }
    }

    pub fn set_listener<F: LayoutListener + 'static>(&mut self, listener: F) {
        self.listener = Box::new(listener);
    }

    pub fn compute_layout(&mut self, available_width: f32, available_height: f32) {
        if self.has_shadow() {
            let mut scrollable = self.scrollable.clone();
            scrollable.update_layout(self);
            for c in &mut self.children {
                c.update_shadow_recursively();
            }
            for c in &mut self.children {
                c.on_layout_update();
            }
        } else {
            self.before_layout_recurse_in_tree();
            self.calculate_layout(available_width, available_height, Direction::LTR);
            self.update_shadow_recursively();
            self.on_layout_update();
        }
    }

    pub fn clear_applied(&mut self) {
        //TODO reset applied_pseudo_element_styles?
        self.applied_style = Styles::new();
    }

    pub fn get_position_type(&self) -> PositionType {
        self.yoga_node.position_type
    }

    pub fn set_scroll_thickness(&mut self, thickness: f32) {
        self.scrollable.horizontal_bar.set_thickness(thickness);
        self.scrollable.vertical_bar.set_thickness(thickness);
    }

    fn resolve_style_props(&self, style_props: HashMap<StylePropKey, FixedStyleProp>, parent: &Option<Self>) -> Styles {
        let mut resolved = HashMap::new();
        for (k, prop) in style_props {
            let v = prop.resolve_value(
                |k| self.get_default_value(k),
                |k| {
                    if let Some(p) = parent {
                        p.get_resolved_value(k)
                    } else {
                        self.get_default_value(k)
                    }
                },
            );
            resolved.insert(k, v);
        }
        Styles::from_map(resolved)
    }

    fn compute_owned_style(&self, hover: bool, parent_style: &Option<Self>) -> (Styles, HashMap<String, Styles>) {
        let mut style_props = self.get_styles(hover);
        for (k, v) in &self.animation_style_props {
            style_props.insert(k.clone(), v.clone());
        }
        let styles = self.resolve_style_props(style_props, &parent_style);
        let mut pseudo_element_styles = HashMap::new();

        for (k, v) in self.get_pseudo_element_style_props() {
            let pe_styles = self.resolve_style_props(v, &parent_style);
            pseudo_element_styles.insert(k, pe_styles);
        }
        (styles, pseudo_element_styles)
    }

    fn apply(&mut self, hover: bool, parent_style: &Option<Self>, length_ctx: &LengthContext) -> (bool, HashMap<String, Vec<ResolvedStyleProp>>) {
        let (styles, pseudo_element_styles) = self.compute_owned_style(hover, &parent_style);

        let changed_styles =
            styles.compute_changed_style(&self.applied_style, |k| self.get_default_value(k));
        let changed = !changed_styles.is_empty();
        for sp in changed_styles {
            let (repaint, need_layout) = self.set_resolved_style_prop(sp, length_ctx);
            if need_layout || repaint {
                self.make_layout_dirty();
            }
        }

        let mut pseudo_element_keys = Vec::new();
        for (k, _) in &pseudo_element_styles {
            pseudo_element_keys.push(k);
        }
        for (k, _) in &self.applied_pseudo_element_styles {
            pseudo_element_keys.push(k);
        }
        let empty_styles = Styles::default();
        let mut changed_pe_styles_map = HashMap::new();
        for k in pseudo_element_keys {
            let new_style = pseudo_element_styles.get(k).unwrap_or(&empty_styles);
            let old_style = self
                .applied_pseudo_element_styles
                .get(k)
                .unwrap_or(&empty_styles);
            let changed_pe_styles =
                new_style.compute_changed_style(&old_style, |k| self.get_default_value(k));
            if !changed_pe_styles.is_empty() {
                changed_pe_styles_map.insert(k.clone(), changed_pe_styles);
            }
        }
        self.applied_style = styles;
        self.applied_pseudo_element_styles = pseudo_element_styles;
        (changed, changed_pe_styles_map)
    }

    pub fn set_style_listener(&mut self, listener: BoxedStyleListener) {
        self.style_listener = listener;
    }
    
    pub fn append_style(&mut self, styles: ParsedStyles) {
        self.style_list.append_style(styles);
        self.make_style_dirty();
    }

    pub fn set_style(&mut self, style: ParsedStyles) {
        self.style_list.set_style(style);
        self.make_style_dirty();
    }

    pub fn set_hover_style(&mut self, style: ParsedStyles) {
        self.style_list.set_hover_style(style);
        if self.hover {
            self.make_style_dirty();
        }
    }
    
    pub fn set_scroll_left(&mut self, value: f32) {
        self.scrollable.horizontal_bar.set_scroll_offset(value);
    }
    
    pub fn get_scroll_left(&self) -> f32 {
        self.scrollable.horizontal_bar.scroll_offset()
    }
    
    pub fn set_scroll_top(&mut self, value: f32) {
        self.scrollable.vertical_bar.set_scroll_offset(value);
    }

    pub fn get_scroll_top(&self) -> f32 {
        self.scrollable.vertical_bar.scroll_offset()
    }

    pub fn get_styles(&self, hover: bool) -> HashMap<StylePropKey, FixedStyleProp> {
        self.style_list.get_styles(hover)
    }

    pub fn get_pseudo_element_style_props(
        &self,
    ) -> HashMap<String, HashMap<StylePropKey, FixedStyleProp>> {
        self.style_list.get_pseudo_element_style_props()
    }

    pub fn resolve_variables(&mut self) {
        let me = self.clone();
        self.style_list.resolve_variables(&mut move |k| {
            me.get_var(k)
        })
    }

    fn get_var(&self, name: &str) -> Option<String> {
        if let Some(v) = self.style_list.vars.get(name) {
            Some(v.to_string())
        } else {
            if let Some(p) = self.get_parent() {
                p.get_var(name)
            } else {
                None
            }
        }
    }

    pub fn has_hover_style(&self) -> bool {
        self.style_list.has_hover_style()
    }

    pub fn set_selector_style(&mut self, styles: Vec<String>) {
        if self.style_list.set_selector_style(styles) {
            self.make_style_dirty();
        }
    }

    pub fn set_style_var(&mut self, key: &str, value: &str) {
        self.style_list.set_style_var(key, value);
        self.make_style_dirty();
    }

    pub fn set_pseudo_element_style(&mut self, styles_map: HashMap<String, Vec<String>>) {
        if self.style_list.set_pseudo_element_style(styles_map) {
            self.make_style_dirty();
        }
    }

    fn on_layout_update(&mut self) {
        self.dirty_flag = DirtyFlag::empty();
        let ml = self.yoga_node.layout.get_layout().unwrap_or(Layout::new(0.0, 0.0, 0.0, 0.0, 0.0, 0.0));
        self.computed.layout = LayoutInfo {
            border_width: self.yoga_node.layout.get_border_width().unwrap_or_default(),
            padding: self.yoga_node.layout.get_padding().unwrap_or_default(),
            bounds: Rect::from_layout(&ml),
        };
        //TODO performance: maybe not changed?
        //TODO use origin bounds?
        let style = self.computed.clone();
        self.listener.after_layout(&style);
        if !self.has_shadow() {
            for child in &mut self.children {
                child.on_layout_update();
            }
        }
    }

    pub(super) fn before_layout_recurse_in_tree(&mut self) {
        self.listener.before_layout();
        if !self.has_shadow() {
            self.before_layout_recurse_for_children();
        }
    }

    pub(super) fn before_layout_recurse_for_children(&mut self) {
        for c in &mut self.children {
            c.before_layout_recurse_in_tree();
        }
    }

    pub fn get_real_content_size(&self) -> (f32, f32) {
        let mut content_width = 0.0;
        let mut content_height = 0.0;
        for c in self.get_children() {
            let cb = c.get_bounds();
            content_width = f32::max(content_width, cb.right());
            content_height = f32::max(content_height, cb.bottom());
        }
        let padding = self.get_padding();
        (content_width + padding.1, content_height + padding.2)
    }

    pub fn get_bounds(&self) -> Rect {
        let ml = self.yoga_node.layout.get_layout().unwrap_or(Layout::new(0.0, 0.0, 0.0,0.0, 0.0, 0.0));
        base::Rect::from_layout(&ml)
    }

    pub fn set_child_decoration(&mut self, decoration: (f32, f32, f32, f32)) {
        self.children_decoration = decoration;
    }

    pub fn get_size(&self) -> [f32; 2] {
        self.yoga_node.layout.get_size().unwrap_or_default()
    }

    pub fn set_layout_measurer<F: LayoutMeasurer + 'static>(
        &mut self,
        mut measure_func: F,
    ) {
        self.yoga_node.set_measure_func((), move |_ctx, params| {
            let size = measure_func.measure_layout(params);
            Size {
                width: size.width,
                height: size.height,
            }
        })
    }

    fn update_shadow_recursively(&mut self) {
        if self.has_shadow() {
            let [width, height] = self.yoga_node.layout.get_size().unwrap_or_default();
            if self.computed.basic.size != (width, height) {
                self.computed.basic.size = (width, height);
                self.compute_layout(width, height);
            }
        }
        for c in &mut self.children {
            c.update_shadow_recursively();
        }
    }

    //TODO remove
    pub fn get_border_width(&self) -> (f32, f32, f32, f32) {
        self.yoga_node.layout.get_border_width().unwrap_or_default()
    }

    //TODO remove
    pub fn get_padding(&self) -> (f32, f32, f32, f32) {
        self.yoga_node.layout.get_padding().unwrap_or_default()
    }

    pub fn get_content_bounds(&self) -> Rect {
        let (t, r, b, l) = self.yoga_node.layout.get_padding().unwrap_or_default();
        let (bt, br, bb, bl) = self.yoga_node.layout.get_border_width().unwrap_or_default();
        let [width, height] = self.yoga_node.layout.get_size().unwrap_or_default();
        // let (width, height) = self.with_container_node(|n| {
        //     (n.get_layout_width().de_nan(0.0), n.get_layout_height().de_nan(0.0))
        // });
        Rect::new(
            l + bl,
            t + bt,
            width - l - r - bl - br,
            height - t - b - bt - bb,
        )
    }

    fn get_resolved_value(&self, key: StylePropKey) -> ResolvedStyleProp {
        if let Some(v) = self.resolved_style_props.get(&key) {
            v.clone()
        } else {
            self.get_default_value(key)
        }
    }

    fn get_default_value(&self, key: StylePropKey) -> ResolvedStyleProp {
        let standard_node = Node::new();
        let default_border_width = LengthOrPercent::Length(Length::PX(0.0));
        let default_border_color = Color::TRANSPARENT;
        match key {
            StylePropKey::Color => ResolvedStyleProp::Color(Color::BLACK),
            StylePropKey::BackgroundColor => ResolvedStyleProp::BackgroundColor(Color::TRANSPARENT),
            StylePropKey::FontSize => ResolvedStyleProp::FontSize(Length::PX(12.0)),
            StylePropKey::FontFamily => ResolvedStyleProp::FontFamily(FontFamilies::default()),
            StylePropKey::FontWeight => ResolvedStyleProp::FontWeight(Weight::NORMAL),
            StylePropKey::FontStyle => ResolvedStyleProp::FontStyle(FontStyle::Normal),
            StylePropKey::LineHeight => ResolvedStyleProp::LineHeight(LineHeightVal::Normal),
            StylePropKey::BorderTopWidth => ResolvedStyleProp::BorderTopWidth(default_border_width),
            StylePropKey::BorderRightWidth => {
                ResolvedStyleProp::BorderRightWidth(default_border_width)
            }
            StylePropKey::BorderBottomWidth => {
                ResolvedStyleProp::BorderBottomWidth(default_border_width)
            }
            StylePropKey::BorderLeftWidth => {
                ResolvedStyleProp::BorderLeftWidth(default_border_width)
            }
            StylePropKey::BorderTopColor => ResolvedStyleProp::BorderTopColor(default_border_color),
            StylePropKey::BorderRightColor => {
                ResolvedStyleProp::BorderRightColor(default_border_color)
            }
            StylePropKey::BorderBottomColor => {
                ResolvedStyleProp::BorderBottomColor(default_border_color)
            }
            StylePropKey::BorderLeftColor => {
                ResolvedStyleProp::BorderLeftColor(default_border_color)
            }
            StylePropKey::Display => ResolvedStyleProp::Display(Display::Flex),
            StylePropKey::Width => {
                // ResolvedStyleProp::Width(standard_node.get_style_width())
                //TODO fix
                ResolvedStyleProp::Width(LengthOrPercent::Undefined)
            }
            StylePropKey::Height => {
                //TODO fix
                ResolvedStyleProp::Height(LengthOrPercent::Undefined)
            }
            StylePropKey::MaxWidth => {
                //TODO fix
                ResolvedStyleProp::MaxWidth(LengthOrPercent::Undefined)
            }
            StylePropKey::MaxHeight => {
                //TODO fix
                ResolvedStyleProp::MaxHeight(LengthOrPercent::Undefined)
            }
            StylePropKey::MinWidth => {
                //TODO fix
                ResolvedStyleProp::MinWidth(LengthOrPercent::Undefined)
            }
            StylePropKey::MinHeight => {
                //TODO fix
                ResolvedStyleProp::MinHeight(LengthOrPercent::Undefined)
            }
            StylePropKey::MarginTop => ResolvedStyleProp::MarginTop(LengthOrPercent::Undefined),
            StylePropKey::MarginRight => ResolvedStyleProp::MarginRight(LengthOrPercent::Undefined),
            StylePropKey::MarginBottom => {
                ResolvedStyleProp::MarginBottom(LengthOrPercent::Undefined)
            }
            StylePropKey::MarginLeft => ResolvedStyleProp::MarginLeft(LengthOrPercent::Undefined),
            StylePropKey::PaddingTop => ResolvedStyleProp::PaddingTop(LengthOrPercent::Undefined),
            StylePropKey::PaddingRight => {
                ResolvedStyleProp::PaddingRight(LengthOrPercent::Undefined)
            }
            StylePropKey::PaddingBottom => {
                ResolvedStyleProp::PaddingBottom(LengthOrPercent::Undefined)
            }
            StylePropKey::PaddingLeft => ResolvedStyleProp::PaddingLeft(LengthOrPercent::Undefined),
            StylePropKey::Flex => ResolvedStyleProp::Flex(standard_node.get_flex()),
            StylePropKey::FlexBasis => ResolvedStyleProp::FlexBasis(LengthOrPercent::Undefined),
            StylePropKey::FlexGrow => ResolvedStyleProp::FlexGrow(standard_node.get_flex_grow()),
            StylePropKey::FlexShrink => {
                ResolvedStyleProp::FlexShrink(standard_node.get_flex_shrink())
            }
            StylePropKey::AlignSelf => ResolvedStyleProp::AlignSelf(Align::FlexStart),
            StylePropKey::Direction => ResolvedStyleProp::Direction(Direction::LTR),
            StylePropKey::Position => ResolvedStyleProp::Position(PositionType::Static),
            StylePropKey::Top => ResolvedStyleProp::Top(LengthOrPercent::Undefined),
            StylePropKey::Right => ResolvedStyleProp::Right(LengthOrPercent::Undefined),
            StylePropKey::Bottom => ResolvedStyleProp::Bottom(LengthOrPercent::Undefined),
            StylePropKey::Left => ResolvedStyleProp::Left(LengthOrPercent::Undefined),
            StylePropKey::Overflow => ResolvedStyleProp::Overflow(Overflow::Hidden),
            StylePropKey::BorderTopLeftRadius => {
                ResolvedStyleProp::BorderTopLeftRadius(Length::PX(0.0))
            }
            StylePropKey::BorderTopRightRadius => {
                ResolvedStyleProp::BorderTopRightRadius(Length::PX(0.0))
            }
            StylePropKey::BorderBottomRightRadius => {
                ResolvedStyleProp::BorderBottomRightRadius(Length::PX(0.0))
            }
            StylePropKey::BorderBottomLeftRadius => {
                ResolvedStyleProp::BorderBottomLeftRadius(Length::PX(0.0))
            }
            StylePropKey::Transform => ResolvedStyleProp::Transform(StyleTransform::empty()),
            StylePropKey::AnimationName => ResolvedStyleProp::AnimationName("".to_string()),
            StylePropKey::AnimationDuration => ResolvedStyleProp::AnimationDuration(0.0),
            StylePropKey::AnimationIterationCount => {
                ResolvedStyleProp::AnimationIterationCount(1.0)
            }

            StylePropKey::JustifyContent => ResolvedStyleProp::JustifyContent(Justify::FlexStart),
            StylePropKey::FlexDirection => ResolvedStyleProp::FlexDirection(FlexDirection::Column),
            StylePropKey::AlignContent => ResolvedStyleProp::AlignContent(Align::FlexStart),
            StylePropKey::AlignItems => ResolvedStyleProp::AlignItems(Align::FlexStart),
            StylePropKey::FlexWrap => ResolvedStyleProp::FlexWrap(Wrap::NoWrap),
            StylePropKey::ColumnGap => ResolvedStyleProp::ColumnGap(Length::PX(0.0)),
            StylePropKey::RowGap => ResolvedStyleProp::RowGap(Length::PX(0.0)),
            //TODO aspectratio
        }
    }

    pub fn set_font_size(&mut self, font_size: f32) {
        self.computed.basic.font_size = font_size;
    }

    pub fn get_children_decoration(&self) -> (f32, f32, f32, f32) {
        self.children_decoration
    }

    fn set_resolved_style_prop(
        &mut self,
        p: ResolvedStyleProp,
        length_ctx: &LengthContext,
    ) -> (bool, bool) {
        let prop_key = p.key();
        if self.resolved_style_props.get(&prop_key) == Some(&p) {
            return (false, false);
        }
        self.resolved_style_props.insert(prop_key, p.clone());
        let repaint = true;
        let mut need_layout = true;

        match p {
            ResolvedStyleProp::Color(v) => {
                self.computed.basic.color = v;
                need_layout = false;
            }
            ResolvedStyleProp::BackgroundColor(value) => {
                self.computed.basic.background_color = value;
                need_layout = false;
            }
            ResolvedStyleProp::FontSize(_) => {
                //Do nothing
                //TODO need_layout = false?
            }
            ResolvedStyleProp::FontFamily(value) => {
                self.computed.basic.font_family = value;
            }
            ResolvedStyleProp::FontWeight(value) => {
                self.computed.basic.font_weight = value;
            }
            ResolvedStyleProp::FontStyle(value) => {
                self.computed.basic.font_style = value;
            }
            ResolvedStyleProp::LineHeight(value) => {
                self.computed.basic.line_height = value.to_px(length_ctx);
            }
            ResolvedStyleProp::BorderTopWidth(value) => {
                self.set_border_width(&value, &vec![0], length_ctx);
            }
            ResolvedStyleProp::BorderRightWidth(value) => {
                self.set_border_width(&value, &vec![1], length_ctx);
            }
            ResolvedStyleProp::BorderBottomWidth(value) => {
                self.set_border_width(&value, &vec![2], length_ctx);
            }
            ResolvedStyleProp::BorderLeftWidth(value) => {
                self.set_border_width(&value, &vec![3], length_ctx);
            }
            ResolvedStyleProp::BorderTopColor(value) => {
                self.set_border_color(&value, &vec![0]);
                need_layout = false;
            }
            ResolvedStyleProp::BorderRightColor(value) => {
                self.set_border_color(&value, &vec![1]);
                need_layout = false;
            }
            ResolvedStyleProp::BorderBottomColor(value) => {
                self.set_border_color(&value, &vec![2]);
                need_layout = false;
            }
            ResolvedStyleProp::BorderLeftColor(value) => {
                self.set_border_color(&value, &vec![3]);
                need_layout = false;
            }
            ResolvedStyleProp::Display(value) => self.yoga_node.display = value,
            ResolvedStyleProp::Width(value) => {
                self.yoga_node.width = value.to_style_unit(&length_ctx);
            }
            ResolvedStyleProp::Height(value) => {
                self.yoga_node.height = value.to_style_unit(&length_ctx)
            }
            ResolvedStyleProp::MaxWidth(value) => {
                self.yoga_node.max_width = value.to_style_unit(&length_ctx)
            }
            ResolvedStyleProp::MaxHeight(value) => {
                self.yoga_node.max_height = value.to_style_unit(&length_ctx)
            }
            ResolvedStyleProp::MinWidth(value) => {
                self.yoga_node.min_width = value.to_style_unit(&length_ctx)
            }
            ResolvedStyleProp::MinHeight(value) => {
                self.yoga_node.min_height = value.to_style_unit(&length_ctx)
            }
            ResolvedStyleProp::MarginTop(value) => {
                self.yoga_node.margin_top = value.to_style_unit(&length_ctx)
            }
            ResolvedStyleProp::MarginRight(value) => {
                self.yoga_node.margin_right = value.to_style_unit(&length_ctx)
            }
            ResolvedStyleProp::MarginBottom(value) => {
                self.yoga_node.margin_bottom = value.to_style_unit(&length_ctx)
            }
            ResolvedStyleProp::MarginLeft(value) => {
                self.yoga_node.margin_left = value.to_style_unit(&length_ctx)
            }
            ResolvedStyleProp::PaddingTop(value) => {
                self.yoga_node.padding_top = value.to_style_unit(&length_ctx)
            }
            ResolvedStyleProp::PaddingRight(value) => {
                self.yoga_node.padding_right = value.to_style_unit(&length_ctx)
            }
            ResolvedStyleProp::PaddingBottom(value) => {
                self.yoga_node.padding_bottom = value.to_style_unit(&length_ctx)
            }
            ResolvedStyleProp::PaddingLeft(value) => {
                self.yoga_node.padding_left = value.to_style_unit(&length_ctx)
            }
            ResolvedStyleProp::Flex(value) => self.yoga_node.flex = value,
            ResolvedStyleProp::FlexBasis(value) => {
                self.yoga_node.flex_basis = value.to_style_unit(&length_ctx)
            }
            ResolvedStyleProp::FlexGrow(value) => self.yoga_node.flex_grow = value,
            ResolvedStyleProp::FlexShrink(value) => self.yoga_node.flex_shrink = value,
            ResolvedStyleProp::AlignSelf(value) => self.yoga_node.align_self = value,
            ResolvedStyleProp::Direction(value) => self.yoga_node.direction = value,
            ResolvedStyleProp::Position(value) => self.yoga_node.position_type = value,
            ResolvedStyleProp::Top(value) => {
                self.yoga_node.top = value.to_style_unit(&length_ctx);
            }
            ResolvedStyleProp::Right(value) => {
                self.yoga_node.right = value.to_style_unit(&length_ctx);
            }
            ResolvedStyleProp::Bottom(value) => {
                self.yoga_node.bottom = value.to_style_unit(&length_ctx);
            }
            ResolvedStyleProp::Left(value) => {
                self.yoga_node.left = value.to_style_unit(&length_ctx);
            }
            ResolvedStyleProp::Overflow(value) => {
                self.yoga_node.overflow = value.to_yoga_overflow();
                let scroll_strategy = match value {
                    Overflow::Visible => ScrollBarStrategy::Never,
                    Overflow::Hidden => ScrollBarStrategy::Never,
                    Overflow::Scroll => ScrollBarStrategy::Always,
                    Overflow::Auto => ScrollBarStrategy::Auto,
                };
                match scroll_strategy {
                    ScrollBarStrategy::Never => {
                        self.need_snapshot = false;
                    }
                    ScrollBarStrategy::Auto | ScrollBarStrategy::Always => {
                        self.need_snapshot = true;
                    }
                }
                self.scrollable.vertical_bar.set_strategy(scroll_strategy);
                self.scrollable.horizontal_bar.set_strategy(scroll_strategy);
            }
            ResolvedStyleProp::BorderTopLeftRadius(value) => {
                self.computed.basic.border_radius[0] = value.to_px(&length_ctx);
            }
            ResolvedStyleProp::BorderTopRightRadius(value) => {
                self.computed.basic.border_radius[1] = value.to_px(&length_ctx);
            }
            ResolvedStyleProp::BorderBottomRightRadius(value) => {
                self.computed.basic.border_radius[2] = value.to_px(&length_ctx);
            }
            ResolvedStyleProp::BorderBottomLeftRadius(value) => {
                self.computed.basic.border_radius[3] = value.to_px(&length_ctx);
            }
            ResolvedStyleProp::Transform(value) => {
                need_layout = false;
                self.computed.basic.transform = Some(value);
            }
            ResolvedStyleProp::AnimationName(value) => {
                need_layout = false;
                let name = value;
                self.animation_params.name = name;
                self.update_animation();
            }
            ResolvedStyleProp::AnimationDuration(value) => {
                need_layout = false;
                let duration = value;
                self.animation_params.duration = duration;
                self.update_animation();
            }
            ResolvedStyleProp::AnimationIterationCount(value) => {
                need_layout = false;
                let ic = value;
                self.animation_params.iteration_count = ic;
                self.update_animation();
            }

            // container node style
            ResolvedStyleProp::JustifyContent(value) => {
                self.yoga_node.justify_content = value;
            }
            ResolvedStyleProp::FlexDirection(value) => {
                self.yoga_node.flex_direction = value;
            }
            ResolvedStyleProp::AlignContent(value) => {
                self.yoga_node.align_content = value;
            }
            ResolvedStyleProp::AlignItems(value) => {
                self.yoga_node.align_items = value;
            }
            ResolvedStyleProp::FlexWrap(value) => {
                self.yoga_node.flex_wrap = value;
            }
            ResolvedStyleProp::ColumnGap(value) => {
                self.yoga_node.column_gap = value.to_px(&length_ctx);
            }
            ResolvedStyleProp::RowGap(value) => {
                self.yoga_node.row_gap = value.to_px(&length_ctx);
            } //TODO aspectratio
        }

        (repaint, need_layout)
    }

    fn update_animation(&mut self) {
        let frame_controller = WindowAnimationController::new(self.style_listener.clone());
        let mut me = self.clone();
        let listener = self.style_listener.clone();
        let weak = self.as_weak();
        let task = create_event_loop_callback(move || {
            let p = &me.animation_params;
            me.animation_instance =
                if p.name.is_empty() || p.duration <= 0.0 || p.iteration_count <= 0.0 {
                    None
                } else {
                    ANIMATIONS.with_borrow(|m| {
                        let ani = m.get(&p.name)?.preprocess();
                        let duration = p.duration * 1000000.0;
                        let iteration_count = p.iteration_count;
                        let actor = CssAnimationActor::new(weak, ani, listener);
                        let mut ani_instance = AnimationInstance::new(
                            actor,
                            duration,
                            iteration_count,
                            Box::new(frame_controller),
                        );
                        ani_instance.run();
                        Some(ani_instance)
                    })
                };
        });
        task.call();
    }

    fn set_border_width(
        &mut self,
        value: &LengthOrPercent,
        edges: &Vec<usize>,
        length_ctx: &LengthContext,
    ) {
        // let default_border = StyleBorder(StyleUnit::UndefinedValue, StyleColor::Color(Color::TRANSPARENT));
        // let value = value.resolve(&default_border);
        //TODO fix percent?
        let width = match value.to_style_unit(length_ctx) {
            StyleUnit::Point(f) => f.0,
            _ => 0.0,
        };
        for index in edges {
            match index {
                0 => self.yoga_node.border_top = width,
                1 => self.yoga_node.border_right = width,
                2 => self.yoga_node.border_bottom = width,
                3 => self.yoga_node.border_left = width,
                _ => {}
            }
        }
    }

    fn set_border_color(&mut self, color: &Color, edges: &Vec<usize>) {
        for index in edges {
            self.computed.basic.border_color[*index] = *color;
        }
    }

    pub fn insert_child(&mut self, child: &mut StyleNode, index: u32) {
        self.children.insert(index as usize, child.clone());
        self.yoga_node
            .children
            .insert(index as usize, child.yoga_node.clone());
        self.make_style_dirty();
        child.parent = Some(self.as_weak());
        child.mark_dirty_flag_recursively(DirtyFlag::StyleDirty);
    }

    pub fn get_children(&self) -> Vec<StyleNode> {
        self.children.clone()
    }

    pub fn remove_child(&mut self, child: &mut StyleNode) {
        let idx = if let Some(p) = self.inner.children.iter().position(|it| it == child) {
            p
        } else {
            return;
        };
        self.yoga_node.children.remove(idx);
        self.inner.children.remove(idx);
        child.parent = None;
        child.make_style_dirty();
        self.make_style_dirty();
    }

    pub fn child_count(&self) -> u32 {
        self.inner.children.len() as u32
    }

    fn calculate_layout(
        &mut self,
        available_width: f32,
        available_height: f32,
        parent_direction: Direction,
    ) {
        self.inner
            .yoga_node
            .calculate_layout(available_width, available_height, parent_direction);
        // self.calculate_shadow_layout();
    }

    pub fn calculate_shadow_layout(
        &mut self,
        available_width: f32,
        available_height: f32,
        parent_direction: Direction,
    ) {
        self.yoga_node
            .calculate_shadow_layout(available_width, available_height, parent_direction);
    }

}

pub fn parse_style_obj(style: JsValue) -> (Vec<ParsedStyleProp>, StyleVars) {
    if let Some(obj) = style.get_properties() {
        let mut list = Vec::new();
        //TODO use default style
        obj.into_iter().for_each(|(k, v)| {
            let v_str = match v {
                JsValue::String(s) => s,
                JsValue::Int(i) => i.to_string(),
                JsValue::Float(f) => f.to_string(),
                _ => return,
            };
            list.push((k, v_str));
        });
        ParsedStyleProp::parse_all(list)
    } else {
        (Vec::new(), StyleVars::new())
    }
}

fn parse_matrix(value: &str) -> Result<Matrix, Error> {
    let parts: Vec<&str> = value.split(",").collect();
    if parts.len() != 6 {
        return Err(anyhow!("invalid value"));
    }
    Ok(create_matrix([
        f32::from_str(parts.get(0).unwrap())?,
        f32::from_str(parts.get(1).unwrap())?,
        f32::from_str(parts.get(2).unwrap())?,
        f32::from_str(parts.get(3).unwrap())?,
        f32::from_str(parts.get(4).unwrap())?,
        f32::from_str(parts.get(5).unwrap())?,
    ]))
}

pub fn format_matrix(v: &Matrix) -> String {
    format!(
        "matrix({},{},{},{},{},{})",
        v.scale_x(),
        v.skew_y(),
        v.skew_x(),
        v.scale_y(),
        v.translate_x(),
        v.translate_y()
    )
}

fn create_matrix(values: [f32; 6]) -> Matrix {
    let scale_x = values[0];
    let skew_y = values[1];
    let skew_x = values[2];
    let scale_y = values[3];
    let trans_x = values[4];
    let trans_y = values[5];
    Matrix::new_all(
        scale_x, skew_x, trans_x, skew_y, scale_y, trans_y, 0.0, 0.0, 1.0,
    )
}
