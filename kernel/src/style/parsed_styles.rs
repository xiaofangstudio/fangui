use quick_js::{JsValue, ValueError};
use crate::js::FromJsValue;
use crate::style::FixedStyleProp;
use crate::style::style_list::{ParsedStyleProp, StyleList};

pub struct ParsedStyles(pub Vec<ParsedStyleProp>);

impl ParsedStyles {

    pub fn set_style_str(&mut self, k: &str, v_str: &str) {
        let list = ParsedStyleProp::parse(k, v_str);
        for p in list {
            self.0.push(p);
        }
    }

    pub fn from_fixed(styles: Vec<FixedStyleProp>) -> Self {
        let mut v = vec![];
        for st in styles {
            v.push(ParsedStyleProp::Fixed(st));
        }
        Self(v)
    }

    pub fn from_string(s: &str) -> Result<Self, ValueError> {
        let mut r = ParsedStyles(vec![]);
        //TODO maybe style value contains ';' char ?
        for (k, v) in StyleList::parse_style_list(s) {
            r.set_style_str(k, v);
        }
        Ok(r)
    }
}

impl FromJsValue for ParsedStyles {
    fn from_js_value(style: JsValue) -> Result<Self, ValueError> {
        let mut r = ParsedStyles(vec![]);
        if let JsValue::String(str) = &style {
            return Self::from_string(str)
        } else if let Some(obj) = style.get_properties() {
            //TODO use default style
            obj.into_iter().for_each(|(k, v)| {
                let v_str = match v {
                    JsValue::String(s) => s,
                    JsValue::Int(i) => i.to_string(),
                    JsValue::Float(f) => f.to_string(),
                    _ => return,
                };
                r.set_style_str(&k, &v_str);
            });
        }
        Ok(r)
    }
}