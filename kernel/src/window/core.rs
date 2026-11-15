use skia_window::renderer::Renderer;
use skia_window::skia_window::SkiaWindow;
use std::any::Any;
use winit::error::NotSupportedError;
use winit::monitor::MonitorHandle;
use winit::window::{Cursor, Fullscreen, ResizeDirection, Theme, WindowId};
use crate::winit::dpi::{PhysicalPosition, PhysicalSize, Position, Size};

/// A trait abstracting the [`DumpWindow`] interface, mirroring the subset of
/// the [`SkiaWindow`] interface used by this project. Any concrete system
/// window backend (e.g. [`DumpWindow`] for headless tests) can implement it.
pub trait SysWindow {

    // --- SkiaWindow specific interface ---

    fn resize_surface(&mut self, width: u32, height: u32);

    /// Downcast this window to `&dyn Any`, used to recover the concrete window
    /// type (e.g. to pass it to [`winit::window::Window::set_modal`]).
    fn as_any(&self) -> &dyn Any;

    fn scale_factor(&self) -> f64;

    fn render_with_result(
        &mut self,
        renderer: Renderer,
        callback: Box<dyn FnOnce(bool) + Send + 'static>,
    );

    // --- winit::window::Window interface (via SkiaWindow Deref) ---

    fn id(&self) -> WindowId;

    fn inner_position(&self) -> Result<PhysicalPosition<i32>, NotSupportedError>;

    fn outer_position(&self) -> Result<PhysicalPosition<i32>, NotSupportedError>;

    fn set_outer_position(&self, position: Position);

    fn set_modal(&self, owner: &dyn SysWindow);

    fn inner_size(&self) -> PhysicalSize<u32>;

    fn request_inner_size(&self, size: Size) -> Option<PhysicalSize<u32>>;

    fn outer_size(&self) -> PhysicalSize<u32>;

    fn set_title(&self, title: &str);

    fn set_visible(&self, visible: bool);

    fn is_visible(&self) -> Option<bool>;

    fn set_minimized(&self, minimized: bool);

    fn is_minimized(&self) -> Option<bool>;

    fn set_maximized(&self, maximized: bool);

    fn is_maximized(&self) -> bool;

    fn set_fullscreen(&self, fullscreen: Option<Fullscreen>);

    fn fullscreen(&self) -> Option<Fullscreen>;

    fn is_decorated(&self) -> bool;

    fn set_ime_cursor_area(&self, position: Position, size: Size);

    fn set_ime_allowed(&self, allowed: bool);

    fn commit_ime(&self);

    fn focus_window(&self);

    fn theme(&self) -> Option<Theme>;

    fn title(&self) -> String;

    fn set_cursor(&self, cursor: Cursor);

    fn set_cursor_visible(&self, visible: bool);

    fn drag_window(&self) -> Result<(), winit::error::ExternalError>;

    fn drag_resize_window(&self, direction: ResizeDirection)
                          -> Result<(), winit::error::ExternalError>;

    fn current_monitor(&self) -> Option<MonitorHandle>;

    fn pointer_position(&self) -> Option<PhysicalPosition<i32>>;

    fn set_enable(&self, enabled: bool);
}

impl SysWindow for SkiaWindow {
    fn as_any(&self) -> &dyn Any {
        self
    }

    fn resize_surface(&mut self, width: u32, height: u32) {
        SkiaWindow::resize_surface(self, width, height);
    }

    fn scale_factor(&self) -> f64 {
        self.winit_window().scale_factor()
    }

    fn render_with_result(
        &mut self,
        renderer: Renderer,
        callback: Box<dyn FnOnce(bool) + Send + 'static>,
    ) {
        SkiaWindow::render_with_result(self, renderer, callback);
    }

    fn id(&self) -> WindowId {
        self.winit_window().id()
    }

    fn inner_position(&self) -> Result<PhysicalPosition<i32>, NotSupportedError> {
        self.winit_window().inner_position()
    }

    fn outer_position(&self) -> Result<PhysicalPosition<i32>, NotSupportedError> {
        self.winit_window().outer_position()
    }

    fn set_outer_position(&self, position: Position) {
        self.winit_window().set_outer_position(position);
    }

    fn set_modal(&self, owner: &dyn SysWindow) {
        if let Some(owner) = owner.as_any().downcast_ref::<SkiaWindow>() {
            self.winit_window().set_modal(owner.winit_window());
        }
    }

    fn inner_size(&self) -> PhysicalSize<u32> {
        self.winit_window().inner_size()
    }

    fn request_inner_size(&self, size: Size) -> Option<PhysicalSize<u32>> {
        self.winit_window().request_inner_size(size)
    }

    fn outer_size(&self) -> PhysicalSize<u32> {
        self.winit_window().outer_size()
    }

    fn set_title(&self, title: &str) {
        self.winit_window().set_title(title);
    }

    fn set_visible(&self, visible: bool) {
        self.winit_window().set_visible(visible);
    }

    fn is_visible(&self) -> Option<bool> {
        self.winit_window().is_visible()
    }

    fn set_minimized(&self, minimized: bool) {
        self.winit_window().set_minimized(minimized);
    }

    fn is_minimized(&self) -> Option<bool> {
        self.winit_window().is_minimized()
    }

    fn set_maximized(&self, maximized: bool) {
        self.winit_window().set_maximized(maximized);
    }

    fn is_maximized(&self) -> bool {
        self.winit_window().is_maximized()
    }

    fn set_fullscreen(&self, fullscreen: Option<Fullscreen>) {
        self.winit_window().set_fullscreen(fullscreen);
    }

    fn fullscreen(&self) -> Option<Fullscreen> {
        self.winit_window().fullscreen()
    }

    fn is_decorated(&self) -> bool {
        self.winit_window().is_decorated()
    }

    fn set_ime_cursor_area(&self, position: Position, size: Size) {
        self.winit_window().set_ime_cursor_area(position, size);
    }

    fn set_ime_allowed(&self, allowed: bool) {
        self.winit_window().set_ime_allowed(allowed);
    }

    fn commit_ime(&self) {
        self.winit_window().commit_ime();
    }

    fn focus_window(&self) {
        self.winit_window().focus_window();
    }

    fn theme(&self) -> Option<Theme> {
        self.winit_window().theme()
    }

    fn title(&self) -> String {
        self.winit_window().title()
    }

    fn set_cursor(&self, cursor: Cursor) {
        self.winit_window().set_cursor(cursor);
    }

    fn set_cursor_visible(&self, visible: bool) {
        self.winit_window().set_cursor_visible(visible);
    }

    fn drag_window(&self) -> Result<(), winit::error::ExternalError> {
        self.winit_window().drag_window()
    }

    fn drag_resize_window(
        &self,
        direction: ResizeDirection,
    ) -> Result<(), winit::error::ExternalError> {
        self.winit_window().drag_resize_window(direction)
    }

    fn current_monitor(&self) -> Option<MonitorHandle> {
        self.winit_window().current_monitor()
    }

    fn pointer_position(&self) -> Option<PhysicalPosition<i32>> {
        self.winit_window().pointer_position()
    }

    fn set_enable(&self, enabled: bool) {
        #[cfg(windows)]
        {
            use winit::platform::windows::WindowExtWindows;
            self.winit_window().set_enable(enabled);
        }
        #[cfg(not(windows))]
        let _ = enabled;
    }
}
