mod future;
pub(crate) mod proxy;
pub(crate) mod core;

use crate::base::{UnsafeFnMut, UnsafeFnOnce, UnsafeFnOnce1};
use std::cell::{Cell, RefCell};
use std::ptr::null_mut;
use std::sync::{Arc, Mutex};
use winit::event_loop::{ActiveEventLoop};
use crate::js::js_event_loop::{js_create_event_loop_proxy, JsEventLoopProxy};

pub use crate::event_loop::future::{spawn_async, AsyncTask};
use crate::event_loop::proxy::AppEventProxy;

thread_local! {
    pub static ACTIVE_EVENT_LOOP: Cell<*const ActiveEventLoop> = Cell::new(null_mut());
    pub static STATIC_EVENT_LOOP_PROXY: RefCell<Option<AppEventProxy>> = RefCell::new(None);
}

pub struct EventLoopCallback {
    event_loop_proxy: JsEventLoopProxy,
    callback: Option<UnsafeFnOnce>,
}

impl EventLoopCallback {
    pub fn call(mut self) {
        let callback = self.callback.take().unwrap();
        self.event_loop_proxy.schedule_macro_task(move || {
            callback.call();
        }).unwrap();
    }
}

pub struct EventLoopFnOnce<P> {
    event_loop_proxy: JsEventLoopProxy,
    callback: Option<UnsafeFnOnce1<P>>,
}

impl<P: Send + 'static> EventLoopFnOnce<P> {
    pub fn call(mut self, p: P) {
        let callback = self.callback.take().unwrap();
        self.event_loop_proxy.schedule_macro_task(move || {
            callback.call(p);
        }).unwrap();
    }
}

pub struct EventLoopFnMutCallback<P> {
    event_loop_proxy: JsEventLoopProxy,
    callback: Arc<Mutex<UnsafeFnMut<P>>>,
}

impl<P> Clone for EventLoopFnMutCallback<P> {
    fn clone(&self) -> Self {
        Self {
            event_loop_proxy: self.event_loop_proxy.clone(),
            callback: self.callback.clone(),
        }
    }
}

impl<P: Send + Sync + 'static> EventLoopFnMutCallback<P> {
    pub fn call(&mut self, param: P) {
        let cb = self.callback.clone();
        let _ = self
            .event_loop_proxy
            .schedule_macro_task(move || {
                let mut cb = cb.lock().unwrap();
                (cb.callback)(param);
            });
    }
}

pub fn create_event_loop_callback<F: FnOnce() + 'static>(callback: F) -> EventLoopCallback {
    let callback = unsafe { UnsafeFnOnce::new(callback) };
    let event_loop_proxy = create_event_loop_proxy();
    EventLoopCallback {
        event_loop_proxy,
        callback: Some(callback),
    }
}

pub fn create_event_loop_fn_once<P: Send + 'static, F: FnOnce(P) + 'static>(callback: F) -> EventLoopFnOnce<P> {
    let callback = unsafe { UnsafeFnOnce1::new(callback) };
    let event_loop_proxy = create_event_loop_proxy();
    EventLoopFnOnce {
        event_loop_proxy,
        callback: Some(callback),
    }
}

pub fn create_event_loop_fn_mut<P: Send, F: FnMut(P) + 'static>(
    callback: F,
) -> EventLoopFnMutCallback<P> {
    let fn_mut = UnsafeFnMut {
        callback: Box::new(callback),
    };
    let event_loop_proxy = create_event_loop_proxy();
    EventLoopFnMutCallback {
        event_loop_proxy,
        callback: Arc::new(Mutex::new(fn_mut)),
    }
}

pub fn create_event_loop_proxy() -> JsEventLoopProxy {
    js_create_event_loop_proxy()
}

pub fn create_app_event_loop_proxy() -> AppEventProxy {
    STATIC_EVENT_LOOP_PROXY.with_borrow(|p| {
        p.as_ref()
            .expect("Failed to create event loop proxy")
            .clone()
    })
}