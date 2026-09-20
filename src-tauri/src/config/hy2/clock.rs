use std::cell::OnceCell;

use objc2::{ClassType as _, define_class, msg_send, rc::Retained, sel};
use objc2_app_kit::{NSWorkspace, NSWorkspaceDidWakeNotification};
use objc2_foundation::{NSNotification, NSNotificationCenter, NSObject, NSSystemClockDidChangeNotification};

use crate::core::handle::Handle;

define_class!(
    #[unsafe(super(NSObject))]
    struct Hy2ClockObserver;

    impl Hy2ClockObserver {
        #[unsafe(method(clockChanged:))]
        fn clock_changed(&self, _notification: &NSNotification) {
            super::CHANGED.notify_one();
        }
    }
);

thread_local! {
    static OBSERVER: OnceCell<Retained<Hy2ClockObserver>> = const { OnceCell::new() };
}

pub(super) fn start() {
    if let Err(error) = Handle::app_handle().run_on_main_thread(|| {
        OBSERVER.with(|slot| {
            slot.get_or_init(|| {
                // The observer lives on the main thread for the application's lifetime;
                // its notification callback only touches the thread-safe Notify.
                unsafe {
                    let observer: Retained<Hy2ClockObserver> = msg_send![Hy2ClockObserver::class(), new];
                    NSNotificationCenter::defaultCenter().addObserver_selector_name_object(
                        &observer,
                        sel!(clockChanged:),
                        Some(NSSystemClockDidChangeNotification),
                        None,
                    );
                    NSWorkspace::sharedWorkspace()
                        .notificationCenter()
                        .addObserver_selector_name_object(
                            &observer,
                            sel!(clockChanged:),
                            Some(NSWorkspaceDidWakeNotification),
                            None,
                        );
                    observer
                }
            });
        });
    }) {
        clash_verge_logging::logging!(
            warn,
            clash_verge_logging::Type::Config,
            "Failed to watch the system clock for Hysteria2 overrides: {error}"
        );
    }
}
