use std::ptr::null_mut;
use winit::event_loop::ActiveEventLoop;
use crate::event_loop::{future, ACTIVE_EVENT_LOOP, STATIC_EVENT_LOOP_PROXY};
use crate::event_loop::proxy::AppEventProxy;

pub fn run_app_event_loop_task<F: FnOnce()>(event_loop: &ActiveEventLoop, callback: F) {
    ACTIVE_EVENT_LOOP.set(event_loop as *const ActiveEventLoop);
    callback();
    ACTIVE_EVENT_LOOP.set(null_mut());
}

pub fn run_with_app_event_loop<R, F: FnOnce(&ActiveEventLoop) -> R>(callback: F) -> R {
    let el = ACTIVE_EVENT_LOOP.get();
    unsafe {
        if el == null_mut() {
            panic!("ActiveEventLoop not found");
        }
        callback(&*el)
    }
}

pub fn init_app_event_loop_proxy(elp: AppEventProxy) {
    STATIC_EVENT_LOOP_PROXY.with_borrow_mut(move |m| {
        m.replace(elp);
    });
    future::init_async_rt();
}