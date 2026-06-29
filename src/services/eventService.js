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
                .from('events')
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
                event_type: eventType,
                meeting_link: meetingLink,
                created_at: new Date().toISOString()
            };
            events[slug] = newEvent;
            saveLocalEvents(events);
            return { data: newEvent, error: null };
        } else {
            const { data, error } = await supabase
                .from('events')
                .insert([{ 
                    slug, 
                    title, 
                    description, 
                    host_email: hostEmail,
                    event_type: eventType,
                    meeting_link: meetingLink
                }])
                .select()
                .single();
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
            const { data, error } = await supabase
                .from('events')
                .update(updates)
                .eq('slug', slug)
                .select()
                .single();
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
        if (isDemoMode) {
            const attendees = getLocalAttendees();
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
            const { data, error } = await supabase
                .from('attendees')
                .insert([{ event_id: eventId, ...attendeeData }])
                .select()
                .single();
            return { data, error };
        }
    },

    /**
     * Kick an attendee from the event
     */
    async kickAttendee(attendeeId) {
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
            const { error } = await supabase
                .from('attendees')
                .delete()
                .eq('id', attendeeId);
            return { error };
        }
    },

    /**
     * Delete all attendees in an event
     */
    async resetEvent(eventId) {
        if (isDemoMode) {
            let attendees = getLocalAttendees();
            const filtered = attendees.filter(a => a.event_id !== eventId);
            saveLocalAttendees(filtered);
            
            window.dispatchEvent(new CustomEvent('circlelink-realtime-reset', { 
                detail: { event_id: eventId } 
            }));
            
            return { error: null };
        } else {
            const { error } = await supabase
                .from('attendees')
                .delete()
                .eq('event_id', eventId);
            return { error };
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
