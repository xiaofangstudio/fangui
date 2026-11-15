//! A no-op window backend that mirrors the subset of the [`SkiaWindow`]
//! interface used by this project.
//!
//! It is meant to replace `SkiaWindow` in special scenarios (e.g. headless
//! tests) where no real OS window is needed. All method bodies are either
//! empty (side-effect setters), return safe defaults, or are `todo!()`
//! placeholders for values that cannot be cheaply produced here.

use raw_window_handle::{HandleError, HasWindowHandle, WindowHandle};
use skia_window::renderer::Renderer;
use skia_window::soft::memory_surface_presenter::MemorySurfacePresenter;
use skia_window::soft::SoftSurface;
use std::any::Any;
use winit::dpi::{PhysicalPosition, PhysicalSize, Position, Size};
use winit::error::NotSupportedError;
use winit::event_loop::ActiveEventLoop;
use winit::monitor::MonitorHandle;
use winit::window::{Cursor, Fullscreen, ResizeDirection, Theme, WindowAttributes, WindowId};
use skia_window::surface::RenderBackend;
use crate::window::SysWindow;

/// A dummy window that implements the same interface as [`SkiaWindow`]
/// (`skia_window::skia_window::SkiaWindow`), restricted to the methods this
/// project actually uses.
pub struct DumpWindow {
    soft_surface: SoftSurface,
}

impl DumpWindow {
    pub fn new(event_loop: &ActiveEventLoop, window_attrs: WindowAttributes) -> Option<Self> {
        let window = event_loop.create_window(window_attrs).ok()?;
        let presenter = MemorySurfacePresenter::new(window);
        let soft_surface = SoftSurface::new(event_loop, presenter);
        Some(Self {
            soft_surface,
        })
    }
}

// --- SkiaWindow specific interface ---

impl SysWindow for DumpWindow {

    fn resize_surface(&mut self, width: u32, height: u32) {
        self.soft_surface.resize(width, height);
    }

    fn as_any(&self) -> &dyn Any {
        self
    }

    fn scale_factor(&self) -> f64 {
        1.0
    }

    fn render_with_result(
        &mut self,
        renderer: Renderer,
        callback: Box<dyn FnOnce(bool) + Send + 'static>,
    ) {
        self.soft_surface.render(renderer, callback);
    }

    // --- winit::window::Window interface (via SkiaWindow Deref) ---

    fn id(&self) -> WindowId {
        WindowId::dummy()
    }

    fn inner_position(&self) -> Result<PhysicalPosition<i32>, NotSupportedError> {
        Ok(PhysicalPosition::new(0, 0))
    }

    fn outer_position(&self) -> Result<PhysicalPosition<i32>, NotSupportedError> {
        Ok(PhysicalPosition::new(0, 0))
    }

    fn set_outer_position(&self, _position: Position) {}

    fn set_modal(&self, _owner: &dyn SysWindow) {}

    fn inner_size(&self) -> PhysicalSize<u32> {
        PhysicalSize::new(0, 0)
    }

    fn request_inner_size(&self, _size: Size) -> Option<PhysicalSize<u32>> {
        None
    }

    fn outer_size(&self) -> PhysicalSize<u32> {
        PhysicalSize::new(0, 0)
    }

    fn set_title(&self, _title: &str) {}

    fn set_visible(&self, _visible: bool) {}

    fn is_visible(&self) -> Option<bool> {
        None
    }

    fn set_minimized(&self, _minimized: bool) {}

    fn is_minimized(&self) -> Option<bool> {
        None
    }

    fn set_maximized(&self, _maximized: bool) {}

    fn is_maximized(&self) -> bool {
        false
    }

    fn set_fullscreen(&self, _fullscreen: Option<Fullscreen>) {}

    fn fullscreen(&self) -> Option<Fullscreen> {
        None
    }

    fn is_decorated(&self) -> bool {
        false
    }

    fn set_ime_cursor_area(&self, _position: Position, _size: Size) {
    }

    fn set_ime_allowed(&self, _allowed: bool) {}

    fn commit_ime(&self) {}

    fn focus_window(&self) {}

    fn theme(&self) -> Option<Theme> {
        None
    }

    fn title(&self) -> String {
        String::new()
    }

    fn set_cursor(&self, _cursor: Cursor) {}

    fn set_cursor_visible(&self, _visible: bool) {}

    fn drag_window(&self) -> Result<(), winit::error::ExternalError> {
        Ok(())
    }

    fn drag_resize_window(
        &self,
        _direction: ResizeDirection,
    ) -> Result<(), winit::error::ExternalError> {
        Ok(())
    }

    fn current_monitor(&self) -> Option<MonitorHandle> {
        None
    }

    fn pointer_position(&self) -> Option<PhysicalPosition<i32>> {
        None
    }
    
    fn set_enable(&self, _enabled: bool) {}
}

impl HasWindowHandle for DumpWindow {
    fn window_handle(&self) -> Result<WindowHandle<'_>, HandleError> {
        Err(HandleError::NotSupported)
    }
}
