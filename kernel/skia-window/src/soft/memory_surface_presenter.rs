use crate::paint::Canvas;
use crate::soft::surface_presenter::SurfacePresenter;
use skia_safe::{AlphaType, ColorSpace, ColorType, ImageInfo};
use std::sync::Arc;
use winit::window::Window;

pub struct MemorySurfacePresenter {
    window: Arc<Window>,
    buffer: Vec<u8>,
    width: u32,
    height: u32,
}
impl MemorySurfacePresenter {
    pub fn new(window: Window) -> MemorySurfacePresenter {
        let window = Arc::new(window);
        let size = window.inner_size();
        Self {
            window,
            width: size.width,
            height: size.height,
            buffer: vec![],
        }
    }
}

impl SurfacePresenter for MemorySurfacePresenter {
    fn window(&self) -> &Window {
        self.window.as_ref()
    }
    fn resize(&mut self, width: u32, height: u32) {
        self.width = width;
        self.height = height;
    }

    fn render(
        &mut self,
        renderer: Box<dyn FnOnce(&Canvas) + Send>,
        callback: Box<dyn FnOnce(bool) + Send + 'static>,
    ) {
        let width = self.width;
        let height = self.height;
        let color_type = ColorType::BGRA8888;
        let img_info = ImageInfo::new(
            (width as i32, height as i32),
            color_type,
            AlphaType::Premul,
            Some(ColorSpace::new_srgb()),
        );
        let len = (width * height * 4) as usize;
        let row_bytes = width as usize * 4;
        if self.buffer.len() != len {
            self.buffer.resize(len, 0);
        }
        let mut surface =
            skia_safe::surfaces::wrap_pixels(&img_info, &mut self.buffer, row_bytes, None).unwrap();
        (renderer)(&mut surface.canvas());
        // Release buffer
        callback(true);
    }

    fn size(&self) -> (u32, u32) {
        (self.width, self.height)
    }
}
