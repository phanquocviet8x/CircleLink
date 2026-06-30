import { supabase, isDemoMode } from '../supabaseClient';

// Helper to generate UUIDs in local storage
const generateUUID = () => 'local-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();

// ==================== LOCAL STORAGE HELPERS (DEMO MODE) ====================
const getLocalEvents = () => {
    const data = localStorage.getItem('circlelink_events');
    return data ? JSON.parse(data) : {};
};

const saveLocalEvents = (events) => {
    localStorage.setItem('circlelink_events', JSON.stringify(events));
};

const getLocalAttendees = () => {
    const data = localStorage.getItem('circlelink_attendees');
    return data ? JSON.parse(data) : [];
};

const saveLocalAttendees = (attendees) => {
    localStorage.setItem('circlelink_attendees', JSON.stringify(attendees));
};

// ==================== UNIFIED SERVICE API ====================
export const eventService = {

    /**
     * Fetch an event by slug
     */
    async getEvent(slug) {
        if (isDemoMode) {
            const events = getLocalEvents();
            // If the event doesn't exist, auto-create a default mock event to make testing seamless
            if (!events[slug]) {
                const defaultEvent = {
                    id: 'event-mock-id-' + slug,
                    slug: slug,
                    title: slug === 'test-event' ? 'Tech Meetup #1: AI & Startup Innovation' : `Sự kiện: ${slug}`,
                    description: slug === 'test-event' ? 'Chia sẻ công nghệ, kết nối đầu tư và tìm kiếm cộng sự phát triển dự án.' : 'Chào mừng bạn tham gia sự kiện và kết nối vòng tròn quan hệ.',
                    is_checkin_open: true,
                    require_phone: false,
                    is_premium: false,
                    event_type: slug === 'test-event' ? 'hybrid' : 'offline',
                    meeting_link: slug === 'test-event' ? 'https://zoom.us/j/123456789' : '',
                    created_at: new Date().toISOString()
                };
                events[slug] = defaultEvent;
                saveLocalEvents(events);
            }
            return { data: events[slug], error: null };
        } else {
            const { data, error } = await supabase
                .from('events_public')
                .select('*')
                .eq('slug', slug)
                .maybeSingle();
            
            return { data, error };
        }
    },

    /**
     * Create a new event
     */
    async createEvent(slug, title, description, hostEmail = null, eventType = 'offline', meetingLink = '') {
        if (isDemoMode) {
            const events = getLocalEvents();
            if (events[slug]) {
                return { data: null, error: { message: "Event slug already exists locally." } };
            }
            const newEvent = {
                id: 'event-' + generateUUID(),
                slug,
                title,
                description,
                host_email: hostEmail,
                is_checkin_open: true,
                require_phone: false,
                is_premium: false,
                event_type: eventType,
                meeting_link: meetingLink,
                created_at: new Date().toISOString()
            };
            events[slug] = newEvent;
            saveLocalEvents(events);
            return { data: newEvent, error: null };
        } else {
            const { data, error } = await supabase
                .rpc('create_event', {
                    p_slug: slug,
                    p_title: title,
                    p_description: description,
                    p_host_email: hostEmail,
                    p_event_type: eventType,
                    p_meeting_link: meetingLink
                });
            return { data, error };
        }
    },

    /**
     * Update event configuration (Title, Desc, Check-in Gate, Phone Required)
     */
    async updateEvent(slug, updates) {
        if (isDemoMode) {
            const events = getLocalEvents();
            if (!events[slug]) {
                return { data: null, error: { message: "Event not found." } };
            }
            events[slug] = { ...events[slug], ...updates };
            saveLocalEvents(events);
            
            // Dispatch a local event to let other windows know the event configuration updated
            window.dispatchEvent(new CustomEvent('circlelink-realtime-event-update', { 
                detail: events[slug] 
            }));
            
            return { data: events[slug], error: null };
        } else {
            const token = localStorage.getItem(`circlelink_admin_token_${slug}`);
            const { data, error } = await supabase
                .rpc('admin_update_event', {
                    p_slug: slug,
                    p_token: token,
                    p_title: updates.title !== undefined ? updates.title : null,
                    p_description: updates.description !== undefined ? updates.description : null,
                    p_is_checkin_open: updates.is_checkin_open !== undefined ? updates.is_checkin_open : null,
                    p_require_phone: updates.require_phone !== undefined ? updates.require_phone : null,
                    p_is_premium: updates.is_premium !== undefined ? updates.is_premium : null,
                    p_event_type: updates.event_type !== undefined ? updates.event_type : null,
                    p_meeting_link: updates.meeting_link !== undefined ? updates.meeting_link : null
                });
            return { data, error };
        }
    },

    /**
     * Get all attendees for a specific event
     */
    async getAttendees(eventId) {
        if (isDemoMode) {
            const attendees = getLocalAttendees();
            const filtered = attendees.filter(a => a.event_id === eventId);
            // Sort by creation date descending
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            return { data: filtered, error: null };
        } else {
            const { data, error } = await supabase
                .from('attendees')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false });
            return { data, error };
        }
    },

    /**
     * Add a new attendee check-in
     */
    async addAttendee(eventId, attendeeData) {
        try {
            if (isDemoMode) {
                const events = getLocalEvents() || {};
                const event = Object.values(events).find(e => e && e.id === eventId);
                const attendees = getLocalAttendees() || [];
                const filtered = attendees.filter(a => a && a.event_id === eventId);
                
                if (event && !event.is_premium && filtered.length >= 50) {
                    return { data: null, error: { message: "LIMIT_EXCEEDED" } };
                }

                const newAttendee = {
                    id: 'guest-' + generateUUID(),
                    event_id: eventId,
                    ...attendeeData,
                    created_at: new Date().toISOString()
                };
                attendees.push(newAttendee);
                saveLocalAttendees(attendees);
                
                // Dispatch dynamic window event for real-time tab syncing
                window.dispatchEvent(new CustomEvent('circlelink-realtime-insert', { 
                    detail: newAttendee 
                }));
                
                return { data: newAttendee, error: null };
            } else {
                // Check if the event is premium
                const { data: event, error: eventErr } = await supabase
                    .from('events_public')
                    .select('is_premium')
                    .eq('id', eventId)
                    .maybeSingle();

                if (!eventErr && event && !event.is_premium) {
                    // Count current attendees
                    const { count, error: countErr } = await supabase
                        .from('attendees')
                        .select('id', { count: 'exact', head: true })
                        .eq('event_id', eventId);

                    if (!countErr && count !== null && count >= 50) {
                        return { data: null, error: { message: "LIMIT_EXCEEDED" } };
                    }
                }

                const { data, error } = await supabase
                    .from('attendees')
                    .insert([{ event_id: eventId, ...attendeeData }])
                    .select()
                    .single();
                return { data, error };
            }
        } catch (err) {
            console.error("Error in addAttendee:", err);
            return { data: null, error: { message: err.message || "Unknown error" } };
        }
    },

    /**
     * Kick an attendee from the event
     */
    async kickAttendee(attendeeId, slug) {
        if (isDemoMode) {
            let attendees = getLocalAttendees();
            const filtered = attendees.filter(a => a.id !== attendeeId);
            saveLocalAttendees(filtered);
            
            // Dispatch event for real-time tab syncing
            window.dispatchEvent(new CustomEvent('circlelink-realtime-delete', { 
                detail: { id: attendeeId } 
            }));
            
            return { error: null };
        } else {
            const token = localStorage.getItem(`circlelink_admin_token_${slug}`);
            const { error } = await supabase
                .rpc('admin_kick_attendee', {
                    p_attendee_id: attendeeId,
                    p_slug: slug,
                    p_token: token
                });
            return { error };
        }
    },

    /**
     * Delete all attendees in an event
     */
    async resetEvent(eventId, slug) {
        if (isDemoMode) {
            let attendees = getLocalAttendees();
            const filtered = attendees.filter(a => a.event_id !== eventId);
            saveLocalAttendees(filtered);
            
            window.dispatchEvent(new CustomEvent('circlelink-realtime-reset', { 
                detail: { event_id: eventId } 
            }));
            
            return { error: null };
        } else {
            const token = localStorage.getItem(`circlelink_admin_token_${slug}`);
            const { error } = await supabase
                .rpc('admin_reset_event', {
                    p_event_id: eventId,
                    p_slug: slug,
                    p_token: token
                });
            return { error };
        }
    },

    /**
     * Verify if the admin token is valid for a given event slug
     */
    async verifyAdminToken(slug, token) {
        if (isDemoMode) {
            return { isValid: true, error: null };
        } else {
            const { data, error } = await supabase
                .rpc('admin_update_event', {
                    p_slug: slug,
                    p_token: token
                });
            return { isValid: !error, error };
        }
    },

    /**
     * Subscribe to real-time additions and removals of attendees
     */
    subscribeToAttendees(eventId, onInsert, onDelete, onReset, onEventUpdate) {
        if (isDemoMode) {
            // Local listeners for tab-to-tab sync
            const handleInsert = (e) => {
                if (e.detail.event_id === eventId) {
                    onInsert(e.detail);
                }
            };
            
            const handleDelete = (e) => {
                onDelete(e.detail.id);
            };
            
            const handleReset = (e) => {
                if (e.detail.event_id === eventId) {
                    onReset();
                }
            };

            const handleEventUpdate = (e) => {
                if (e.detail.id === eventId && onEventUpdate) {
                    onEventUpdate(e.detail);
                }
            };
            
            window.addEventListener('circlelink-realtime-insert', handleInsert);
            window.addEventListener('circlelink-realtime-delete', handleDelete);
            window.addEventListener('circlelink-realtime-reset', handleReset);
            window.addEventListener('circlelink-realtime-event-update', handleEventUpdate);
            
            // Return unsubscribe function
            return () => {
                window.removeEventListener('circlelink-realtime-insert', handleInsert);
                window.removeEventListener('circlelink-realtime-delete', handleDelete);
                window.removeEventListener('circlelink-realtime-reset', handleReset);
                window.removeEventListener('circlelink-realtime-event-update', handleEventUpdate);
            };
        } else {
            // Supabase Database Channel Subscription
            const channel = supabase
                .channel(`event-realtime-${eventId}`)
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'attendees', 
                    filter: `event_id=eq.${eventId}` 
                }, payload => {
                    onInsert(payload.new);
                })
                .on('postgres_changes', { 
                    event: 'DELETE', 
                    schema: 'public', 
                    table: 'attendees'
                    // Note: delete filter by foreign key eq isn't fully supported in some PG versions,
                    // we handle checking the kicked ID in the callback or reload
                }, payload => {
                    // payload.old will contain the ID of the deleted row
                    if (payload.old && payload.old.id) {
                        onDelete(payload.old.id);
                    }
                })
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'events',
                    filter: `id=eq.${eventId}`
                }, payload => {
                    if (onEventUpdate) {
                        onEventUpdate(payload.new);
                    }
                });

            channel.subscribe();
            
            return () => {
                supabase.removeChannel(channel);
            };
        }
    }
};
