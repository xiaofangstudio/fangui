use crate as deft;
use std::collections::HashMap;
use deft_macros::mrc_object;
use crate::style;
use crate::style::parsed_styles::ParsedStyles;
use crate::ui::checkbox::{ChangeEvent};
use crate::ui::container::Container;
use crate::ui::{ElementDelegate, ElementWeak};
use crate::ui::image::Image;
use crate::ui::label::Label;
use crate::style::ResolvedStyleProp;

#[mrc_object]
pub struct CheckboxDelegate {
    pub element: ElementWeak,
    pub box_container: Container,
    pub checked: bool,
    pub img: Image,
    pub label: Label,
}

impl ElementDelegate for CheckboxDelegate {
    fn accept_pseudo_element_styles(&mut self, styles: HashMap<String, Vec<ResolvedStyleProp>>) {
        if let Some(styles) = styles.get("box") {
            let styles = styles.iter().map(|s| s.to_unresolved()).collect::<Vec<_>>();
            self.box_container.append_style(ParsedStyles::from_fixed(styles));
        }
    }

    fn on_attribute_changed(&mut self, key: &str, value: Option<&str>) {
        match key {
            "checked" => self.update_checked(value.is_some()),
            _ => {},
        }
    }
}

impl CheckboxDelegate {
    pub fn update_checked(&mut self, checked: bool) {
        if self.checked != checked {
            self.checked = checked;
            self.update_children();
            self.element.emit(ChangeEvent {});
        }
    }

    pub fn update_children(&mut self) {
        let style = if self.checked {
            style!("display:flex")
        } else {
            style!("display:none")
        };
        self.img.append_style(style);
    }
}