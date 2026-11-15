use std::cell::RefCell;
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};
use quick_js::{JsValue, ValueError};
use tokio::runtime::{Builder, Runtime};
use tokio::task::{JoinError, JoinHandle};
use crate::event_loop::{create_event_loop_fn_once};
use crate::js::js_engine::JsEngine;
use crate::js::ToJsValue;

thread_local! {
    static ASYNC_RUNTIME: RefCell<Option<Runtime>> = RefCell::new(None);
}

pub struct AsyncTask<R: Send + 'static> {
    handle: JoinHandle<R>,
}

impl<R: Send + 'static> AsyncTask<R> {

    pub(crate) fn new(handle: JoinHandle<R>) -> AsyncTask<R> {
        Self { handle }
    }

    pub fn finally<F: FnOnce(Result<R, JoinError>) + 'static>(self, f: F) -> AsyncTask<()> {
        let cb = create_event_loop_fn_once(move |p| {
            f(p);
        });
        let handle = self.handle;
        spawn_async(async move {
            let r = handle.await;
            cb.call(r);
        })
    }

}

impl<R: Send + 'static> Future for AsyncTask<R> {
    type Output = Result<R, JoinError>;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        Pin::new(&mut self.get_mut().handle).poll(cx)
    }
}

impl<R: Send + ToJsValue + 'static> ToJsValue for AsyncTask<R> {
    fn to_js_value(self) -> Result<JsValue, ValueError> {
        let mut js_engine = JsEngine::get();
        let (result, resolver) = js_engine.create_promise();
        self.finally(move |result| {
            let (ok, value) = match result {
                Ok(r) => {
                    match r.to_js_value() {
                        Ok(v) => (true, v),
                        Err(e) => (false, JsValue::String(format!("{:?}", e))),
                    }
                }
                Err(e) => {
                    (false, JsValue::String(format!("{:?}", e)))
                }
            };
            if ok {
                resolver.resolve(value)
            } else {
                resolver.reject(value)
            }
        });
        Ok(result)
    }
}

pub(super) fn init_async_rt() {
    #[cfg(not(emscripten_platform))]
    let runtime = {
        Builder::new_multi_thread()
            .worker_threads(std::thread::available_parallelism().map(|n| n.get()).unwrap_or(4))
            .enable_all()
            .build()
            .unwrap()
    };
    #[cfg(emscripten_platform)]
    let runtime = { Builder::new_current_thread().enable_all().build().unwrap() };
    ASYNC_RUNTIME.replace(Some(runtime));
}

pub fn spawn_async<F>(future: F) -> AsyncTask<F::Output>
where
    F: Future + Send + 'static,
    F::Output: Send + 'static,
{
    with_rt(move |rt| {
        AsyncTask::new(rt.spawn(future))
    })
}

fn with_rt<R, F: FnOnce(&mut Runtime) -> R>(callback: F) -> R {
    ASYNC_RUNTIME.with_borrow_mut(move |rt| {
        let rt = rt.as_mut().expect("Must call in main thread");
        callback(rt)
    })
}