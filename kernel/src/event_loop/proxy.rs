use winit::event_loop::{EventLoopClosed, EventLoopProxy};
use crate::app::{AppEvent, AppEventPayload};
use crate::base::ResultWaiter;

#[derive(Clone)]
pub struct AppEventProxy {
    proxy: EventLoopProxy<AppEventPayload>,
}

impl AppEventProxy {
    pub fn new(proxy: EventLoopProxy<AppEventPayload>) -> AppEventProxy {
        Self { proxy }
    }

    pub fn send_event(
        &self,
        event: AppEvent,
    ) -> Result<ResultWaiter<()>, EventLoopClosed<AppEventPayload>> {
        let result_waiter = ResultWaiter::new();
        self.proxy.send_event(AppEventPayload {
            event,
            result_waiter: result_waiter.clone(),
        })?;
        Ok(result_waiter)
    }
}