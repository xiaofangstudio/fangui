use crate::style::PropValueParse;
use cssparser::parse_color_keyword;
use skia_safe::Color;
use std::str::FromStr;

impl PropValueParse for Color {
    fn parse_prop_value(value: &str) -> Option<Self> {
        parse_color(value)
    }
    fn to_style_string(&self) -> String {
        format!(
            "#{:02X}{:02X}{:02X}{:02X}",
            self.r(),
            self.g(),
            self.b(),
            self.a()
        )
    }
}

pub trait ColorHelper {
    fn is_transparent(&self) -> bool;
}

impl ColorHelper for Color {
    fn is_transparent(&self) -> bool {
        self.a() == 0
    }
}

pub fn parse_color_str(value: &str) -> Option<Color> {
    //TODO support white,black and so on
    if let Some(hex) = value.strip_prefix("#") {
        parse_hex_color(hex)
    } else {
        None
    }
}

pub fn parse_optional_color_str(value: Option<&String>) -> Option<Color> {
    if let Some(str) = value {
        parse_color_str(str)
    } else {
        None
    }
}

pub fn parse_color(value: &str) -> Option<Color> {
    if let Some(hex) = value.strip_prefix("#") {
        parse_hex_color(hex)
    } else if let Ok(c) = parse_color_keyword(value) {
        match c {
            cssparser::Color::CurrentColor => None,
            cssparser::Color::RGBA(rgba) => Some(Color::from_argb(
                rgba.alpha, rgba.red, rgba.green, rgba.blue,
            )),
        }
    } else if let Some(rgb) = value.strip_prefix("rgb(") {
        let mut params = rgb.strip_suffix(")")?.split(',').map(|p| p.trim());
        let r = u8::from_str(params.next()?).ok()?;
        let g = u8::from_str(params.next()?).ok()?;
        let b = u8::from_str(params.next()?).ok()?;
        if params.next().is_none() {
            Some(Color::from_rgb(r, g, b))
        } else {
            None
        }
    } else if let Some(rgba) = value.strip_prefix("rgba(") {
        let mut params = rgba.strip_suffix(")")?.split(',').map(|p| p.trim());
        let r = u8::from_str(params.next()?).ok()?;
        let g = u8::from_str(params.next()?).ok()?;
        let b = u8::from_str(params.next()?).ok()?;
        let a = u8::from_str(params.next()?).ok()?;
        if params.next().is_none() {
            Some(Color::from_argb(a, r, g, b))
        } else {
            None
        }
    } else {
        None
    }
}

pub fn parse_hex_color(value: &str) -> Option<Color> {
    let mut chars = value.chars();
    let mut hex_chars = ['F'; 8];
    if value.len() == 3 || value.len() == 4 {
        for i in 0..value.len() {
            let c = chars.next().unwrap();
            hex_chars[i * 2] = c;
            hex_chars[i * 2 + 1] = c;
        }
    } else if value.len() == 6 || value.len() == 8 {
        for i in 0..value.len() {
            hex_chars[i] = chars.next().unwrap();
        }
    } else {
        return None;
    }
    let r = hex2u8([hex_chars[0], hex_chars[1]])?;
    let g = hex2u8([hex_chars[2], hex_chars[3]])?;
    let b = hex2u8([hex_chars[4], hex_chars[5]])?;
    let a = hex2u8([hex_chars[6], hex_chars[7]])?;
    Some(Color::from_argb(a, r, g, b))
}

fn hex2u8(hex: [char; 2]) -> Option<u8> {
    let hi = hex[0].to_digit(16)?;
    let lo = hex[1].to_digit(16)?;
    Some((hi * 16 + lo) as u8)
}
