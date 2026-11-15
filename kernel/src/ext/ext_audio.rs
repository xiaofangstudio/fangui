use crate as deft;
use std::cell::{Cell, RefCell};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use crate::base::{EventContext, EventListener, EventRegistration};
use crate::ext::audio_player::{AudioCurrentChangeInfo, AudioMeta, AudioNotify, AudioServer, AudioSources};
use crate::js::js_event_loop::{js_create_event_loop_proxy, JsEventLoopProxy};
use crate::{bind_js_event_listener, js_deserialize, js_module, js_value};
use anyhow::Error;
use deft_macros::{event, js_methods, mrc_object};
use quick_js::JsValue;
use serde::{Deserialize, Serialize};
use crate::js::JsError;

thread_local! {
    pub static NEXT_ID: Cell<u32> = Cell::new(1);
    pub static PLAYING_MAP: RefCell<HashMap<u32, Audio >> = RefCell::new(HashMap::new());
    pub static PLAYER: AudioServer = AudioServer::new({
        let elp = js_create_event_loop_proxy();
        move |id, msg| {
            let elp = elp.clone();
            handle_play_notify(elp, id, msg)
        }
    });
}

#[event]
pub struct LoadEvent(AudioMeta);
#[event]
pub struct TimeUpdateEvent(f32);
#[event]
pub struct EndEvent;
#[event]
pub struct FinishEvent;
#[event]
pub struct PauseEvent;
#[event]
pub struct StopEvent;
#[event]
pub struct CurrentChangeEvent(AudioCurrentChangeInfo);


#[mrc_object]
pub struct Audio {
    id: u32,
    event_registration: EventRegistration,
    sources: Arc<Mutex<AudioSources>>,
}

js_module!(Audio, include_str!("./audio.js"));

impl AudioData {
    pub fn new(id: u32, sources: Arc<Mutex<AudioSources>>) -> Self {
        Self {
            id,
            event_registration: EventRegistration::new(),
            sources,
        }
    }
}

#[derive(Serialize, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioOptions {
    sources: Vec<String>,
    index: Option<usize>,
    cache_dir: Option<String>,
    auto_loop: Option<bool>,
}

fn handle_play_notify(elp: JsEventLoopProxy, id: u32, msg: AudioNotify) {
    let _ = elp.schedule_macro_task(move || {
        let mut audio = PLAYING_MAP.with_borrow_mut(|m| m.get(&id).cloned());
        if let Some(a) = &mut audio {
            match msg {
                AudioNotify::Load(meta) => {
                    let mut ctx = EventContext::new();
                    a.event_registration.emit(LoadEvent(meta), &mut ctx);
                }
                AudioNotify::TimeUpdate(time) => {
                    let mut ctx = EventContext::new();
                    a.event_registration.emit(TimeUpdateEvent(time), &mut ctx);
                }
                AudioNotify::End => {
                    let mut ctx = EventContext::new();
                    a.event_registration.emit(EndEvent, &mut ctx);
                }
                AudioNotify::Finish => {
                    let mut ctx = EventContext::new();
                    a.event_registration.emit(FinishEvent, &mut ctx);
                    unregistry_playing(a);
                }
                AudioNotify::Pause => {
                    let mut ctx = EventContext::new();
                    a.event_registration.emit(PauseEvent, &mut ctx);
                }
                AudioNotify::Stop => {
                    let mut ctx = EventContext::new();
                    a.event_registration.emit(StopEvent, &mut ctx);
                }
                AudioNotify::CurrentChange(info) => {
                    let mut ctx = EventContext::new();
                    a.event_registration.emit(CurrentChangeEvent(info), &mut ctx);
                }
            }
        }
    });
}

fn registry_playing(audio: &Audio) {
    let audio = audio.clone();
    PLAYING_MAP.with_borrow_mut(move |m| {
        m.insert(audio.id, audio);
    })
}

fn unregistry_playing(audio: &Audio) {
    let id = audio.id;
    PLAYING_MAP.with_borrow_mut(move |m| {
        m.remove(&id);
    })
}

js_value!(Audio);
js_deserialize!(AudioOptions);

#[js_methods]
impl Audio {
    #[js_func]
    pub fn create(options: AudioOptions) -> Result<Audio, Error> {
        let id = NEXT_ID.get();
        NEXT_ID.set(id + 1);

        let sources = AudioSources {
            urls: options.sources,
            next_index: options.index.unwrap_or(0),
            cache_dir: options.cache_dir,
            auto_loop: options.auto_loop.unwrap_or(false),
            download_handle: None,
        };
        let audio = AudioData::new(id, Arc::new(Mutex::new(sources)));
        Ok(audio.to_ref())
    }

    #[js_func]
    pub fn play(audio: Audio) -> Result<(), Error> {
        registry_playing(&audio);
        PLAYER.with(move |p| p.play(audio.id, audio.sources.clone()));
        Ok(())
    }

    #[js_func]
    pub fn pause(audio: Audio) -> Result<(), Error> {
        PLAYER.with(|p| p.pause(audio.id));
        Ok(())
    }

    #[js_func]
    pub fn stop(&self) -> Result<(), Error> {
        unregistry_playing(&self);
        PLAYER.with(|p| p.stop(self.id));
        Ok(())
    }

    #[js_func]
    pub fn add_event_listener(
        &mut self,
        event_type: String,
        listener: JsValue,
    ) -> Result<u32, JsError> {
        let id = bind_js_event_listener!(
            self, event_type.as_str(), listener;
            "load" => LoadEventListener,
            "timeupdate"  => TimeUpdateEventListener,
            "end"  => EndEventListener,
            "finish"   => FinishEventListener,
            "pause" => PauseEventListener,
            "stop" => StopEventListener,
            "currentchange" => CurrentChangeEventListener,
        );
        let id = id.ok_or_else(|| JsError::new(format!("unknown event_type:{}", event_type)))?;
        Ok(id)
    }

    #[js_func]
    pub fn remove_event_listener(&mut self, event_type: String, id: u32) -> Result<(), Error> {
        self.event_registration
            .remove_event_listener(&event_type, id);
        Ok(())
    }

    pub fn register_event_listener<T: 'static, H: EventListener<T> + 'static>(
        &mut self,
        listener: H,
    ) -> u32 {
        self.event_registration.register_event_listener(listener)
    }

    pub fn unregister_event_listener(&mut self, id: u32) {
        self.event_registration.unregister_event_listener(id)
    }

}
