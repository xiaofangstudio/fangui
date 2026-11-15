use ordered_float::OrderedFloat;
use deft::style;
use deft::style::{ResolvedStyleProp, StyleNode};
use deft::style::length::LengthContext;
use deft::style::overflow::Overflow;
use deft::ui::Element;

//TODO fix test
// #[test]
fn test_layout() {
    let mut root = StyleNode::new();
    root.set_style(style!("flex-direction:row;"));
    let (mut scroll, content) = create_scroll_node();
    root.insert_child(&mut scroll, 0);


    for size in [(400.0, 300.0), (800.0, 600.0)] {
        let (viewport_width, viewport_height) = size;
        let length_context = LengthContext {
            root: 12.0,
            font_size: 12.0,
            viewport_width,
            viewport_height,
        };
        // root.apply_style_update(false, &length_context);

        root.build();
        root.compute_layout(viewport_width, viewport_height);

        scroll.build();
        scroll.compute_layout(viewport_width, viewport_height);

        assert_eq!([viewport_width, viewport_height], root.get_size());
        assert_eq!([viewport_width, viewport_height], scroll.get_size());
        assert_eq!([20000.0, 20000.0], content.get_size());
    }

}

fn create_scroll_node() -> (StyleNode, StyleNode) {
    let mut scroll = StyleNode::new();
    scroll.set_style(style!("overflow:auto;width:100%;height:100%;"));

    let mut content = StyleNode::new();
    content.set_style(style!("width:20000px; height:20000px"));

    scroll.insert_child(&mut content, 0);
    (scroll, content)
}