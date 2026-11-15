use crate as deft;
use std::collections::HashMap;
use deft_macros::mrc_object;
use crate::style;
use crate::style::parsed_styles::ParsedStyles;
use crate::ui::container::Container;
use crate::ui::{DescendantsChangeType, Element, ElementDelegate, ElementWeak};
use crate::ui::image::Image;
use crate::ui::radio::{ChangeEvent};
use crate::style::ResolvedStyleProp;

#[mrc_object]
struct RadioDelegate {
    pub element: ElementWeak,
    pub checked: bool,
    pub group: Option<RadioGroupDelegate>,
    pub img: Image,
    pub box_element: Container,
}

impl RadioDelegate {

    pub fn new(box_element: Container, element: ElementWeak, img: Image) -> Self {
        RadioDelegateData {
            box_element,
            element,
            checked: false,
            group: None,
            img,
        }.to_ref()
    }
    pub fn set_checked(&mut self, checked: bool) {
        match (checked, &mut self.group.clone()) {
            (true, Some(group)) => {
                for o in group.radio_list.iter_mut() {
                    let new_checked = self == o;
                    o.update_self_checked(new_checked);
                }
            },
            _ => self.update_self_checked(checked),
        }
    }

    fn update_self_checked(&mut self, new_checked: bool) {
        if self.checked != new_checked {
            self.checked = new_checked;
            self.update_children();
        }
    }

    pub fn update_children(&mut self) {
        let styles = if self.checked {
            style!("display:flex")
        } else {
            style!("display:none")
        };
        self.img.append_style(styles)
    }

    pub fn update_checked(&mut self, checked: bool) -> anyhow::Result<()> {
        if self.checked != checked {
            self.set_checked(checked);
            self.element.emit(ChangeEvent {});
        }
        Ok(())
    }

}

impl ElementDelegate for RadioDelegate {
    fn accept_pseudo_element_styles(&mut self, styles: HashMap<String, Vec<ResolvedStyleProp>>) {
        if let Some(styles) = styles.get("box") {
            let styles = styles.iter().map(|s| s.to_unresolved()).collect::<Vec<_>>();
            self.box_element.append_style(ParsedStyles::from_fixed(styles));
        }
    }

    fn on_attribute_changed(&mut self, key: &str, value: Option<&str>) {
        match key {
            "checked" => {
                let _ = self.update_checked(value.is_some());
            },
            _ => {},
        }
    }
}


#[mrc_object]
struct RadioGroupDelegate {
    radio_list: Vec<RadioDelegate>,
}

impl RadioGroupDelegate {
    pub fn new() -> Self {
        RadioGroupDelegateData {
            radio_list: vec![],
        }.to_ref()
    }
}

impl RadioGroupDelegate {

    fn search_radio_recursively(&self, element: &Element, ty: DescendantsChangeType) {
        if let Some(mut radio_state) = element.resource_table.get::<RadioDelegate>().cloned() {
            let mut group_state = self.clone();
            match ty {
                DescendantsChangeType::Attached => {
                    let has_checked = group_state.radio_list.iter().find(|r| r.checked).is_some();
                    if has_checked {
                        radio_state.update_self_checked(false);
                    }
                    radio_state.group = Some(group_state.clone());
                    group_state.radio_list.push(radio_state);
                }
                DescendantsChangeType::Removed => {
                    radio_state.group = None;
                    group_state.radio_list.retain(|r| r != &radio_state);
                }
            }
        } else {
            for c in element.get_children() {
                self.search_radio_recursively(&c, ty);
            }
        }
    }
}


impl ElementDelegate for RadioGroupDelegate {
    fn on_descendant_changed(&self, descendant_root: &Element, ty: DescendantsChangeType) {
        self.search_radio_recursively(descendant_root, ty);
    }
}