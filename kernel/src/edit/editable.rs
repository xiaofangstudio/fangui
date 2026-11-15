use crate as deft;
use crate::app::AppEvent;
use crate::base::{Callback, Rect};
use crate::canvas_util::CanvasHelper;
use crate::edit::edit_history::{EditDetail, EditHistory};
use crate::ui::{Element, Widget, ElementDelegate, ElementWeak};
use crate::event::{BlurEventListener, CaretChangeEvent, FocusEventListener, KeyDownEventListener, KeyEventDetail, MouseDownEventListener, MouseLeaveEventListener, PreeditEventListener, ScrollEventListener, TextChangeEvent, TextInputEventListener, TextUpdateEvent, KEY_MOD_CTRL, KEY_MOD_SHIFT};
use crate::event_loop::{create_app_event_loop_proxy};
use crate::js::{FromJsValue, ToJsValue};
use crate::number::DeNan;
use crate::render::RenderFn;
use crate::string::StringUtils;
use crate::style::ResolvedStyleProp;
use crate::text::textbox::{TextBox, TextCoord, TextElement, TextUnit};
use crate::text::TextAlign;
use crate::timer::TimerHandle;
use crate::winit::dpi::{LogicalPosition, LogicalSize, Size};
use crate::{ok_or_return, timer};
use deft_macros::{widget, js_methods, mrc_object};
use quick_js::{JsValue, ValueError};
use serde::{Deserialize, Serialize};
use skia_safe::{Color, Paint};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use winit::keyboard::NamedKey;
use winit::window::{Cursor, CursorIcon};
use crate::style::computed_style::{BasicComputedStyle, ComputedStyle};
use crate::style::listener::LayoutListener;
use crate::style::measure::LayoutMeasurer;
use crate::style::node_item::MeasureParams;
use crate::style::style_listener::StyleListener;

#[derive(Debug, Copy, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum InputType {
    Text,
    Password,
}

impl ToJsValue for InputType {
    fn to_js_value(self) -> Result<JsValue, ValueError> {
        let str = match self {
            InputType::Text => "text",
            InputType::Password => "password",
        };
        Ok(JsValue::String(str.to_string()))
    }
}

impl FromJsValue for InputType {
    fn from_js_value(value: JsValue) -> Result<Self, ValueError> {
        if let JsValue::String(value) = value {
            let value = value.to_lowercase();
            match value.as_str() {
                "text" => Ok(InputType::Text),
                "password" => Ok(InputType::Password),
                _ => Err(ValueError::UnexpectedType),
            }
        } else {
            Err(ValueError::UnexpectedType)
        }
    }
}

#[derive(Default)]
struct EditableState {
    focusing: bool,
    caret_visible: bool,
    caret_paint: Paint,
    caret_pos: Rect,
    has_text: bool,
}
impl EditableDelegate {

    fn get_caret_pixels_position(&self) -> Option<Rect> {
        let el = self.element.upgrade().ok()?;
        let (scroll_left, scroll_top) = el.style.scrollable.scroll_offset();
        //TODO remove clone
        let caret_rect = self.clone().paragraph.get_caret_rect()?;
        let x = caret_rect.x - scroll_left;
        let y = caret_rect.y - scroll_top;
        Some(Rect::new(x, y, 1.0, caret_rect.height))
    }

    fn update_ime(&self) -> Option<()> {
        let el = self.element.upgrade().ok()?;
        let pos = self.get_caret_pixels_position()?;
        let win = el.get_window()?;
        let win = win.upgrade().ok()?;
        let el_offset = el.get_bounding_client_rect();
        let x = (el_offset.x + pos.x) as f64;
        let y = (el_offset.y + pos.bottom()) as f64;
        win.window.set_ime_cursor_area(
            crate::winit::dpi::Position::Logical(LogicalPosition { x, y }),
            Size::Logical(LogicalSize {
                width: 1.0,
                height: 1.0,
            }),
        );
        let mut state = self.state.lock().unwrap();
        state.caret_pos = pos;
        Some(())
    }

}

#[mrc_object]
struct EditableDelegate {
    element: ElementWeak,
    line_height: f32,
    multiple_line: bool,
    paragraph: TextBox,
    placeholder: TextBox,
    measure_called: bool,
    input_type: InputType,
    caret_timer_handle: Option<TimerHandle>,
    align: TextAlign,
    edit_history: EditHistory,
    rows: u32,
    disabled: bool,
    auto_height: bool,
    //Note: (width, line_height)
    last_layout_size: Option<(f32, f32)>,
    state: Arc<Mutex<EditableState>>,
}

impl EditableDelegate {
    fn set_text(&mut self, text: String) {
        let old_text = self.paragraph.get_text();
        if text != old_text {
            self.paragraph.clear();
            let lines = text.split('\n').collect::<Vec<&str>>();
            for ln in lines {
                let ln = ln.trim_line_endings();
                self.paragraph.add_line(Editable::build_line(ln.to_string()));
            }
            self.update_caret_value(TextCoord::new((0, 0)), false);
        }
        self.state.lock().unwrap().has_text = !text.is_empty();
        self.make_layout_invalid();
    }

    pub fn set_placeholder(&mut self, placeholder: String) {
        self.placeholder.clear();
        self.placeholder.add_line(Editable::build_line(placeholder));
        self.make_layout_invalid();
    }

    pub fn set_multiple_line(&mut self, multiple_line: bool) {
        self.multiple_line = multiple_line;
        self.paragraph.set_text_wrap(multiple_line);
        self.make_layout_invalid();
    }

    pub fn set_rows(&mut self, rows: u32) {
        self.rows = rows;
        self.make_layout_invalid();
    }

    pub fn set_auto_height(&mut self, value: bool) {
        self.auto_height = value;
        self.make_layout_invalid();
    }

    fn make_layout_invalid(&mut self) {
        self.last_layout_size = None;
        self.element.make_layout_dirty();
    }
}

impl EditableDelegate {

    fn layout(&mut self, bounds: &Rect) {
        let mut line_height = self.line_height;
        let bounds_width = bounds.width.de_nan(f32::INFINITY);
        let bounds_height = bounds.height.de_nan(f32::INFINITY);

        let mut layout_width = bounds_width;
        if !self.multiple_line {
            let content_height = bounds_height;
            line_height = content_height;
            layout_width = f32::NAN;
        }
        let last_layout_size = Some((layout_width, line_height));
        if self.last_layout_size == last_layout_size {
            return;
        }
        self.last_layout_size = last_layout_size;

        self.placeholder.set_line_height(line_height);
        self.placeholder.set_layout_width(layout_width);
        self.placeholder.layout();

        self.paragraph.set_layout_width(layout_width);
        self.paragraph.layout();
    }

    fn handle_focus(&mut self) {
        let _ = self.update_ime();
        {
            let mut state = self.state.lock().unwrap();
            state.focusing = true;
            // self.emit_caret_change();
            state.caret_visible = true;
        }
        self.caret_timer_handle = Some({
            let state = self.state.clone();
            let context = self.element.clone();
            timer::set_interval(
                move || {
                    //debug!("onInterval");
                    Editable::caret_tick(state.clone(), context.clone());
                },
                500,
            )
        });
        self.element.request_repaint();
        let el = ok_or_return!(self.element.upgrade());
        if let Some(window) = el.get_window() {
            if let Ok(f) = window.upgrade() {
                let elp = create_app_event_loop_proxy();
                elp.send_event(AppEvent::ShowSoftInput(f.get_id())).unwrap();
            }
        }
    }

    fn handle_blur(&mut self) {
        self.caret_timer_handle = None;
        {
            let mut state = self.state.lock().unwrap();
            state.focusing = false;
            state.caret_visible = false;
            let mut el = ok_or_return!(self.element.upgrade());
            if let Some(window) = el.get_window() {
                if let Ok(f) = window.upgrade() {
                    let elp = create_app_event_loop_proxy();
                    elp.send_event(AppEvent::HideSoftInput(f.get_id())).unwrap();
                }
            }
            el.request_repaint();
        }
    }

    fn insert_text(&mut self, input: &str, mut caret: TextCoord, record_history: bool) {
        let mut delete_detail = None;
        let mut insert_detail = None;
        let selection = self.paragraph.get_selection();
        if !selection.is_empty() {
            let (start, end) = selection.normalize();
            let selected_text = self.paragraph.get_selection_text().unwrap_or(String::new());
            if start.0 == end.0 {
                let line_text = self.paragraph.get_line_text(start.0).unwrap();
                let left = line_text.substring(0, start.1);
                let right = line_text.substring(end.1, line_text.chars_count());
                let new_text = format!("{}{}", left, right);
                self.paragraph
                    .update_line(caret.0, Editable::build_line(new_text));
            } else {
                let first_line = self.paragraph.get_line_text(start.0).unwrap();
                let left = first_line.substring(0, start.1).to_string();
                let last_line = self.paragraph.get_line_text(end.0).unwrap();
                let right = last_line
                    .substring(end.1, last_line.chars_count())
                    .to_string();
                self.paragraph
                    .update_line(start.0, Editable::build_line(format!("{}{}", left, right)));
                if end.0 > start.0 {
                    for _ in start.0..end.0 {
                        self.paragraph.delete_line(start.0 + 1);
                    }
                }
            }
            self.paragraph.unselect();
            self.update_caret_value(start, false);
            caret = start;
            if start != end {
                delete_detail = Some(EditDetail {
                    content: selected_text,
                    end,
                });
            }
        }
        let start_caret = caret;
        if !input.is_empty() {
            let line_text = self.paragraph.get_line_text(caret.0).unwrap();
            let left_str = line_text.substring(0, caret.1);
            let right_str = line_text.substring(caret.1, line_text.len() - caret.1);
            let input_lines = input.split('\n').collect::<Vec<&str>>();
            let new_caret = if input_lines.len() == 1 {
                let new_text = format!("{}{}{}", left_str, input, right_str);
                self.paragraph
                    .update_line(caret.0, Editable::build_line(new_text));
                TextCoord(caret.0, caret.1 + input.chars_count())
            } else {
                let first_line = format!("{}{}", left_str, unsafe { input_lines.get_unchecked(0) });
                self.paragraph
                    .insert_line(caret.0, Editable::build_line(first_line));
                if input_lines.len() > 2 {
                    for i in 1..input_lines.len() - 1 {
                        let line = unsafe { input_lines.get_unchecked(i).to_string() };
                        self.paragraph
                            .insert_line(caret.0 + i, Editable::build_line(line));
                    }
                }
                let last_line = format!(
                    "{}{}",
                    unsafe { input_lines.get_unchecked(input_lines.len() - 1) },
                    right_str
                );
                self.paragraph
                    .update_line(caret.0 + input_lines.len() - 1, Editable::build_line(last_line));
                TextCoord(
                    caret.0 + input_lines.len() - 1,
                    input_lines.last().unwrap().chars_count(),
                )
            };
            //TODO maybe update caret twice?
            self.update_caret_value(new_caret, false);
            insert_detail = Some(EditDetail {
                content: input.to_string(),
                end: self.paragraph.get_caret(),
            });
        }

        if record_history {
            self.edit_history.record_input(start_caret, delete_detail, insert_detail);
        }

        // emit text update
        let text = self.paragraph.get_text().to_string();
        self.element.emit(TextUpdateEvent {
            value: text.clone(),
        });

        // emit text change
        self.element.emit(TextChangeEvent { value: text });

        self.make_layout_invalid();
    }

    fn update_caret_value(&mut self, new_caret: TextCoord, is_kb_vertical: bool) {
        let old_caret = self.paragraph.get_caret();
        self.paragraph.update_caret_value(new_caret, is_kb_vertical);
        if new_caret != old_caret {
            //TODO remove?
            // if let Some(caret1) = &self.selecting_begin {
            //     let begin = TextCoord::min(*caret1, new_caret);
            //     let end = TextCoord::max(*caret1, new_caret);
            //     if begin != end {
            //         self.base.select(begin, end);
            //     } else {
            //         self.base.unselect();
            //     }
            // }
            self.element.request_repaint();
            //TODO do not use loop callback?
            // Note: here use loop callback because of paragraph has not been layout when receive caret change event
            let mut me = self.clone();
            let var_weak = self.as_weak();
            let callback = Callback::new(move || {
                if let Ok(var) = var_weak.upgrade() {
                    var.update_ime();
                }
                me.emit_caret_change();
            });
            let el = ok_or_return!(self.element.upgrade());
            el.with_window(|mut w| {
                w.request_next_paint_callback(callback);
            });
        }
    }

    fn emit_caret_change(&mut self) {
        let caret = self.paragraph.get_caret();

        self.element.emit(CaretChangeEvent {
            row: caret.0,
            col: caret.1,
        });
    }

    fn handle_input(&mut self, input: &str) {
        //debug!("on input:{}", input);
        let caret = self.paragraph.get_caret();
        self.insert_text(input, caret, true);
    }

    fn get_text_for_copy(&self) -> String {
        if self.input_type == InputType::Text {
            self.paragraph
                .get_selection_text()
                .unwrap_or_else(String::new)
        } else {
            String::new()
        }
    }

    #[cfg(feature = "clipboard")]
    fn copy(&self) {
        use clipboard::{ClipboardContext, ClipboardProvider};
        let text_for_copy = self.get_text_for_copy();
        if !text_for_copy.is_empty() {
            let mut ctx: ClipboardContext = ClipboardProvider::new().unwrap();
            ctx.set_contents(text_for_copy).unwrap();
        }
    }

    #[cfg(feature = "clipboard")]
    fn cut(&mut self) {
        self.copy();
        self.handle_input("");
    }

    #[cfg(feature = "clipboard")]
    fn paste(&mut self) {
        use clipboard::{ClipboardContext, ClipboardProvider};
        let mut ctx: ClipboardContext = ClipboardProvider::new().unwrap();
        if let Ok(text) = ctx.get_contents() {
            self.handle_input(&text);
        }
    }

    fn setup_auto_scroll_callback(&mut self) {
        let el = ok_or_return!(self.element.upgrade());
        if let Some(mut p) = el.get_parent() {
            let me = self.as_weak();
            p.style.scrollable.set_autoscroll_callback(move || {
                let me = me.upgrade().ok()?;
                me.get_caret_pixels_position()
            });
        }
    }

    fn show_menu(&self, x: f32, y: f32) {
        use crate::menu::{Menu, MenuItem, StandardMenuItem};
        let mut menu = Menu::create();
        #[cfg(feature = "clipboard")]
        {
            let (cut_menu, copy_menu) = {
                let text_for_copy = self.get_text_for_copy();
                let is_empty = text_for_copy.is_empty();
                let me_weak = self.as_weak();
                let mut copy_item = StandardMenuItem::new("Copy", move || {
                    if let Ok(me) = me_weak.upgrade() {
                        me.copy();
                    }
                });
                copy_item.set_disabled(is_empty);

                let me_weak = self.as_weak();
                let mut cut_item = StandardMenuItem::new("Cut", move || {
                    if let Ok(mut me) = me_weak.upgrade() {
                        me.cut();
                    }
                });
                cut_item.set_disabled(is_empty);
                (cut_item, copy_item)
            };
            let paste_menu = {
                let content = crate::ext::ext_clipboard::Clipboard::read_text()
                    .ok()
                    .unwrap_or_else(String::new);
                let has_content = !content.is_empty();
                let me_weak = self.as_weak();
                let mut item = StandardMenuItem::new("Paste", move || {
                    if let Ok(mut me) = me_weak.upgrade() {
                        me.paste();
                    }
                });
                item.set_disabled(!has_content);
                item
            };
            menu.add_item(MenuItem::Standard(cut_menu));
            menu.add_item(MenuItem::Standard(copy_menu));
            menu.add_item(MenuItem::Standard(paste_menu));
            menu.add_item(MenuItem::Separator);
        }
        let select_all_menu = {
            let me_weak = self.as_weak();
            let content = self.paragraph.get_text();
            let allow_select_all =
                !content.is_empty() && Some(content) != self.paragraph.get_selection_text();
            let mut item = StandardMenuItem::new("Select All", move || {
                if let Ok(mut me) = me_weak.upgrade() {
                    me.paragraph.select_all();
                }
            });
            item.set_disabled(!allow_select_all);
            item
        };
        menu.add_item(MenuItem::Standard(select_all_menu));

        let el = ok_or_return!(self.element.upgrade());
        if let Some(w) = el.get_window() {
            if let Ok(w) = w.upgrade() {
                w.popup_menu(menu, x, y);
            }
        }

    }

    fn handle_key_down(&mut self, event: &KeyEventDetail) {
        #[cfg(target_os = "macos")]
        let shortcut_modifier = crate::event::KEY_MOD_META;
        #[cfg(not(target_os = "macos"))]
        let shortcut_modifier = crate::event::KEY_MOD_CTRL;
        if event.modifiers == 0 {
            if let Some(nk) = &event.named_key {
                match nk {
                    NamedKey::Backspace => {
                        let end = self.paragraph.get_caret();
                        if self.paragraph.get_selection().is_empty() {
                            if end.0 > 0 || end.1 > 0 {
                                self.move_caret(-1);
                                let start = self.paragraph.get_caret();
                                self.paragraph.select(start, end);
                            }
                        }
                        self.handle_input("");
                    }
                    NamedKey::Enter => {
                        if self.multiple_line {
                            self.handle_input("\n");
                        }
                    }
                    NamedKey::ArrowLeft => {
                        self.move_caret(-1);
                    }
                    NamedKey::ArrowRight => {
                        self.move_caret(1);
                    }
                    NamedKey::ArrowUp => {
                        self.move_caret_vertical(true);
                    }
                    NamedKey::ArrowDown => {
                        self.move_caret_vertical(false);
                    }
                    NamedKey::Space => {
                        self.handle_input(" ");
                    }
                    NamedKey::Tab => {
                        //TODO use \t?
                        self.handle_input("   ");
                    }
                    _ => {}
                }
            } else if let Some(text) = &event.key_str {
                self.handle_input(&text);
            }
        } else if event.modifiers == KEY_MOD_SHIFT {
            if let Some(text) = &event.key_str {
                self.handle_input(&text);
            }
        } else if event.modifiers == shortcut_modifier {
            if let Some(text) = &event.key_str {
                match text.as_str() {
                    #[cfg(feature = "clipboard")]
                    "c" => self.copy(),
                    #[cfg(feature = "clipboard")]
                    "x" => self.cut(),
                    #[cfg(feature = "clipboard")]
                    "v" => self.paste(),
                    "a" => self.select_all(),
                    "z" => {
                        self.undo();
                    }
                    _ => {}
                }
            }
        } else if event.modifiers == KEY_MOD_CTRL | KEY_MOD_SHIFT {
            if let Some(text) = &event.key_str {
                match text.to_lowercase().as_str() {
                    "z" => {
                        self.redo();
                    }
                    _ => {}
                }
            }
        }
    }

    fn select_all(&mut self) {
        self.paragraph.select_all();
    }

    fn move_caret(&mut self, delta: isize) {
        self.paragraph.move_caret(delta);
    }

    fn move_caret_vertical(&mut self, is_up: bool) {
        self.paragraph.move_caret_vertical(is_up);
    }

    fn undo(&mut self) {
        if let Some(op) = self.edit_history.undo() {
            if let Some(insert) = op.insert {
                self.paragraph.select(op.caret, insert.end);
            }
            let delete_content = op.delete.map(|it| it.content).unwrap_or_else(String::new);
            self.insert_text(&delete_content, op.caret, false);
        }
    }

    fn redo(&mut self) {
        if let Some(op) = self.edit_history.redo() {
            if let Some(delete) = op.delete {
                self.paragraph.select(op.caret, delete.end);
            }
            let insert_content = op.insert.map(|it| it.content).unwrap_or_else(String::new);
            self.insert_text(&insert_content, op.caret, false);
        }
    }

}


#[widget]
pub struct Editable {
    // base: Scroll,
    delegate: EditableDelegate,
}

#[js_methods]
impl Editable {
    #[js_func]
    pub fn get_text(&self) -> String {
        self.delegate.paragraph.get_text()
    }

    #[js_func]
    pub fn set_text(&mut self, text: String) {
        self.delegate.set_text(text)
    }

    #[js_func]
    pub fn set_placeholder(&mut self, placeholder: String) {
        self.delegate.set_placeholder(placeholder);
    }

    #[js_func]
    pub fn get_placeholder(&self) -> String {
        self.delegate.placeholder.get_text()
    }

    #[js_func]
    pub fn set_placeholder_style(&mut self, _style: JsValue) {
        //TODO impl
        // self.placeholder_element.update_style(style, false);
    }

    #[js_func]
    pub fn set_multiple_line(&mut self, multiple_line: bool) {
        self.delegate.set_multiple_line(multiple_line);
    }

    #[js_func]
    pub fn set_rows(&mut self, rows: u32) {
        self.delegate.set_rows(rows);
    }

    #[js_func]
    pub fn set_auto_height(&mut self, value: bool) {
        self.delegate.set_auto_height(value);
    }

    #[js_func]
    pub fn set_selection_by_char_offset(&mut self, start: usize, end: usize) {
        if let Some(start_caret) = self.delegate.paragraph.get_text_coord_by_char_offset(start) {
            if let Some(end_caret) = self.delegate.paragraph.get_text_coord_by_char_offset(end) {
                self.delegate.paragraph.select(start_caret, end_caret);
            }
        }
    }

    #[js_func]
    pub fn set_caret_by_char_offset(&mut self, char_offset: usize) {
        if let Some(caret) = self.delegate.paragraph.get_text_coord_by_char_offset(char_offset) {
            self.delegate.update_caret_value(caret, false);
        }
    }

    #[js_func]
    pub fn set_type(&mut self, input_type: InputType) {
        match &input_type {
            InputType::Text => {
                self.delegate.paragraph.set_mask_char(None);
            }
            InputType::Password => {
                self.delegate.paragraph.set_mask_char(Some('*'));
            }
        }
        self.delegate.input_type = input_type;
    }

    #[js_func]
    pub fn get_type(&self) -> InputType {
        self.delegate.input_type.clone()
    }

    #[js_func]
    pub fn is_disabled(&self) -> bool {
        self.delegate.disabled
    }

    #[js_func]
    pub fn set_disabled(&mut self, disabled: bool) {
        if disabled {
            self.el.set_attribute("disabled".to_string(), "".to_string());
        } else {
            self.el.remove_attribute("disabled".to_string());
        }
    }
    
    pub fn set_max_history(&mut self, max_history: usize) {
        self.delegate.edit_history.set_max_history(max_history);
    }
    
    pub fn get_max_history(&self) -> usize {
        self.delegate.edit_history.get_max_history()
    }

    fn caret_tick(state: Arc<Mutex<EditableState>>, mut context: ElementWeak) {
        let mut state = state.lock().unwrap();
        state.caret_visible = !state.caret_visible;
        context.request_repaint();
    }

    fn handle_input(&mut self, input: &str) {
        self.delegate.handle_input(input)
    }

    pub fn build_line(text: String) -> Vec<TextElement> {
        let unit = TextElement::Text(TextUnit {
            text,
            font_families: None,
            font_size: None,
            color: None,
            text_decoration_line: None,
            weight: None,
            background_color: None,
            style: None,
        });
        vec![unit]
    }

    fn bind_events(&mut self) {
        //TODO do not handle event when disabled
        let me = self.delegate.as_weak();
        self.el.register_event_listener(FocusEventListener::new(move |_e, _ctx| {
            let mut me = ok_or_return!(me.upgrade());
            me.handle_focus();
        }));

        let me = self.delegate.as_weak();
        self.el.register_event_listener(BlurEventListener::new(move |_e, _ctx| {
            let mut me = ok_or_return!(me.upgrade());
            me.handle_blur();
        }));

        let me = self.delegate.as_weak();
        self.el.register_event_listener(TextInputEventListener::new(move |e, _ctx| {
            let mut me = ok_or_return!(me.upgrade());
            let caret = me.paragraph.get_caret();
            me.insert_text(e.0.as_str(), caret, true);
        }));

        let me = self.delegate.as_weak();
        self.el.register_event_listener(ScrollEventListener::new(move |_e, _ctx| {
            let me = ok_or_return!(me.upgrade());
            me.update_ime();
        }));

        let me = self.el.as_weak();
        self.el.register_event_listener(MouseLeaveEventListener::new(move |_e, _ctx| {
            let mut me = ok_or_return!(me.upgrade());
            me.set_cursor(Cursor::Icon(CursorIcon::Default));
        }));

        let me = self.delegate.as_weak();
        self.el.event_registration.set_default_behavior_handler(MouseDownEventListener::new(move |e, ctx| {
            if e.0.button == 2 {
                let me = ok_or_return!(me.upgrade());
                me.show_menu(e.0.window_x, e.0.window_y);
                ctx.propagation_cancelled = true;
            }
        }));

        let me = self.delegate.as_weak();
        self.el.event_registration.set_default_behavior_handler(KeyDownEventListener::new(move |e, _ctx| {
            let mut me = ok_or_return!(me.upgrade());
            me.handle_key_down(&e.0);
        }));

        let me = self.delegate.as_weak();
        self.el.event_registration.set_default_behavior_handler(PreeditEventListener::new(move |e, _ctx| {
            let mut var = ok_or_return!(me.upgrade());
            var.handle_input(&e.content);
            if !e.content.is_empty() {
                let end_caret = var.paragraph.get_caret();
                let content_chars_count = e.content.chars_count() as isize;
                if let Some(start_caret) = var.paragraph.calculate_caret(-content_chars_count) {
                    var.paragraph.select(start_caret, end_caret);
                    if let Some(offset) = e.offset {
                        let char_offset = if offset == 0 {
                            0
                        } else {
                            e.content[0..offset].chars_count()
                        } as isize;
                        if char_offset < content_chars_count {
                            var.paragraph.move_caret( char_offset - content_chars_count)
                        }
                    }
                }
            }
        }));
    }

    pub fn accept_pseudo_element_styles(&mut self, styles: HashMap<String, Vec<ResolvedStyleProp>>) {
        if let Some(placeholder_styles) = styles.get("placeholder") {
            for style in placeholder_styles {
                match style {
                    ResolvedStyleProp::Color(color) => {
                        self.delegate.placeholder.set_color(*color);
                    }
                    _ => {}
                }
            }
        }
    }
}

impl Editable {
    pub fn new() -> Self {
        let mut ele = Element::new_untagged();
        //TODO register and emit in parent element?
        ele.register_js_event::<CaretChangeEvent>("caretchange");
        ele.set_focusable(true);
        // TODO move to outer element
        ele.allow_ime = true;
        // let mut base = Scroll::create(ele);
        let mut paragraph = TextBox::new();
        paragraph.bind_event(&mut ele);
        let mut placeholder = TextBox::new();
        paragraph.set_text_wrap(false);
        placeholder.set_text_wrap(false);
        let state = Arc::new(Mutex::new(EditableState::default()));

        //TODO support custom style
        placeholder.set_color(Color::from_rgb(80, 80, 80));

        // ele.set_cursor(CursorIcon::Text);
        // base.set_scroll_x(ScrollBarStrategy::Never);
        // base.set_scroll_y(ScrollBarStrategy::Never);

        paragraph.add_line(Self::build_line("".to_string()));
        {
            let mut element_weak = ele.as_weak();
            paragraph.set_repaint_callback(move || {
                element_weak.request_repaint();
            });
        }

        // Default style
        let mut editable_state = EditableState::default();
        editable_state.caret_paint.set_stroke_width(2.0);

        let mut delegate = EditableDelegateData {
            paragraph,
            placeholder,
            multiple_line: false,
            line_height: 12.0 * 1.2,
            measure_called: false,
            element: ele.as_weak(),
            input_type: InputType::Text,
            //paint_offset: 0f32,
            // text_changed_listener: Vec::new(),
            caret_timer_handle: None,
            align: TextAlign::Left,
            edit_history: EditHistory::new(10),
            rows: 5,
            disabled: false,
            auto_height: true,
            state: state.clone(),
            last_layout_size: None,
        }.to_ref();

        {
            let state = state.clone();
            let delegate_weak = delegate.as_weak();
            delegate.paragraph.set_layout_callback(move |has_text| {
                let mut state = state.lock().unwrap();
                state.has_text = has_text;
                let mut delegate = ok_or_return!(delegate_weak.upgrade());
                delegate.make_layout_invalid();
            });
            let delegate_weak = delegate.as_weak();
            delegate.placeholder.set_layout_callback(move |_has_text| {
                let mut delegate = ok_or_return!(delegate_weak.upgrade());
                delegate.make_layout_invalid();
            });
        }

        ele.set_layout_listener(delegate.clone());
        ele.style.set_layout_measurer(delegate.clone());
        ele.set_delegate(delegate.clone());
        let mut inst = Editable {
            // base,
            delegate,
            el: ele,
        };
        inst.set_multiple_line(false);
        {
            let var_weak = inst.delegate.as_weak();
            inst.delegate.paragraph.set_caret_change_callback(move || {
                let mut var = ok_or_return!(var_weak.upgrade());
                var.setup_auto_scroll_callback();
                var.emit_caret_change();
                var.update_ime();
                var.element.request_repaint();
            });
        }

        inst.bind_events();

        inst
    }

    // fn on_event(&mut self, event: &mut Event, ctx: &mut EventContext<ElementWeak>) {
    //     self.handle_event(event, ctx, (0.0, 0.0));
    // }

    // fn on_attribute_changed(&mut self, key: &str, value: Option<&str>) {
    //     match key {
    //         "disabled" => self.disabled = value.is_some(),
    //         _ => {}
    //     }
    // }
}

impl Widget for Editable {}

impl ElementDelegate for EditableDelegate {

    fn render(&mut self) -> RenderFn {
        let state = self.state.clone();
        let mut placeholder_renderer = self.placeholder.render();
        let mut paragraph_renderer = self.paragraph.render();
        RenderFn::new(move |painter| {
            let canvas = painter.canvas;
            let state = state.lock().unwrap();
            let text_render = if state.has_text {
                &mut paragraph_renderer
            } else {
                &mut placeholder_renderer
            };
            canvas.session(move |_| {
                text_render.run(painter);
            });
            canvas.session(move |_| {
                if state.focusing && state.caret_visible {
                    let caret_pos = state.caret_pos;
                    let start = (caret_pos.x, caret_pos.y);
                    let end = (caret_pos.x, caret_pos.bottom());
                    canvas.draw_line(start, end, &state.caret_paint);
                }
            });
        })
    }

}

impl LayoutMeasurer for EditableDelegate {
    fn measure_layout(&mut self, params: MeasureParams) -> crate::base::Size {
        let width = if self.multiple_line {
            params.width
        } else {
            f32::NAN
        };
        let height = params.height;
        let bounds = Rect::new(0.0, 0.0, width, height);
        self.layout(&bounds);
        let state = self.state.lock().unwrap();
        let (width, height) = if !state.has_text && self.multiple_line {
            self.placeholder.get_size_without_padding()
        } else {
            self.paragraph.get_size_without_padding()
        };
        crate::base::Size { width, height }
    }
}

impl LayoutListener for EditableDelegate {
    fn after_style_resolved(&mut self, base_style: &BasicComputedStyle) {
        self.paragraph.set_color(base_style.color);
        self.placeholder.set_font_size(base_style.font_size);
        self.placeholder.set_line_height(base_style.line_height);
        self.placeholder.set_font_families(base_style.font_family.clone());

        self.paragraph.set_line_height(base_style.line_height);
        self.paragraph.set_font_style(base_style.font_style);
        self.paragraph.set_font_size(base_style.font_size);
        self.paragraph.set_line_height(base_style.line_height);
        self.paragraph.set_font_weight(base_style.font_weight);
        self.paragraph.set_font_families(base_style.font_family.clone());
        self.paragraph.set_color(base_style.color);

        {
            let mut state = self.state.lock().unwrap();
            state.caret_paint.set_color(base_style.color);
        }
    }

    fn before_layout(&mut self) {
        self.measure_called = false;
    }

    fn after_layout(&mut self, style: &ComputedStyle) {
        if !self.measure_called {
            self.layout(&style.bounds());
        }
        self.update_ime();
    }
}

#[cfg(test)]
mod tests {
    use crate::edit::editable::Editable;
    use crate::string::StringUtils;
    use crate::text::textbox::TextCoord;

    //FIXME test failed because not in event loop
    // #[test]
    fn test_caret() {
        let mut entry = Editable::new();
        entry.set_text("1\n12\n123\n1234".to_string());
        // entry.caret = TextCoord::new((0, 0));
        let expected_carets = vec![
            TextCoord(0, 1),
            TextCoord(1, 0),
            TextCoord(1, 1),
            TextCoord(1, 2),
            TextCoord(2, 0),
            TextCoord(2, 1),
            TextCoord(2, 2),
            TextCoord(2, 3),
            TextCoord(3, 0),
            TextCoord(3, 1),
            TextCoord(3, 2),
            TextCoord(3, 3),
            TextCoord(3, 4),
        ];
        for c in expected_carets {
            entry.delegate.move_caret(1);
            assert_eq!(entry.delegate.paragraph.get_caret(), c);
        }
    }

    //TODO error because of missing event loop
    // #[test]
    pub fn test_edit_history() {
        let mut entry = Editable::new();
        let text1 = "hello";
        let text2 = "world";
        let text_all = "helloworld";
        // input text1
        entry.handle_input(text1);
        assert_eq!(text1, entry.get_text());
        // input text2
        entry.handle_input(text2);
        assert_eq!(text_all, entry.get_text());
        // delete text2
        // entry.paragraph.select(TextCoord(0, text1.chars_count()), TextCoord(0, text1.chars_count() + text2.chars_count()));
        entry.handle_input("");
        assert_eq!(text1, entry.get_text());
        // undo
        entry.delegate.undo();
        assert_eq!(text_all, entry.get_text());
        assert_eq!(text_all.chars_count(), entry.delegate.paragraph.get_caret().1);
        entry.delegate.undo();
        assert_eq!("", entry.get_text());
        assert_eq!(0, entry.delegate.paragraph.get_caret().1);
    }
}
