// src/components/ModalContact.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useData } from "../../hooks/useData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const LOCATION_API = import.meta.env.VITE_LOCATION_API_KEY;
interface ModalProps {onClose: () => void;}

const ModalContact = ({ onClose }: ModalProps) => {
  const { website_config } = useData();

  // refs & state to mirror the PHP DOM manipulations
  const locationRef = useRef<HTMLSpanElement | null>(null);
  const [formVisible, setFormVisible] = useState(true);
  const [statusVisible, setStatusVisible] = useState(false);
  const [statusTitle, setStatusTitle] = useState("Sending Message...");
  const [statusMessage, setStatusMessage] = useState("Please wait while we send your message.");
  const [statusIcon, setStatusIcon] = useState<"spinner" | "check" | "times">("spinner");

  // Geolocation fetch (IP-based) with timeout and retry UI like PHP
  const getUserLocation = useCallback(() => {
    const el = locationRef.current;
    if (!el) return;

    // remove previous error/retry
    const parent = el.parentElement!;
    parent.querySelector(".location-error")?.remove();
    parent.querySelector(".location-retry")?.remove();

    el.textContent = "Getting location...";

    const timer = setTimeout(() => {
      el.textContent = "Couldn't get location";
      const errorDiv = document.createElement("div");
      errorDiv.className = "location-error";
      errorDiv.textContent = "Location request timed out. Please try again.";
      parent.appendChild(errorDiv);

      const retryBtn = document.createElement("button");
      retryBtn.className = "location-retry";
      retryBtn.textContent = "Retry Location";
      retryBtn.onclick = getUserLocation;
      parent.appendChild(retryBtn);
    }, 30000);


    fetch(`https://api.ipgeolocation.io/ipgeo?apiKey=${LOCATION_API}`)
      .then((r) => {
        clearTimeout(timer);
        if (!r.ok) throw new Error("Network response was not ok");
        return r.json();
      })
      .then((data) => {
        clearTimeout(timer);
        const country = data?.location?.country_name || "";
        const state = data?.location?.city || "";
        el.textContent = [state, country].filter(Boolean).join(", ");
      })
      .catch((err) => {
        clearTimeout(timer);
        console.error("Error fetching location:", err);
        el.textContent = "Couldn't get location";

        const errorDiv = document.createElement("div");
        errorDiv.className = "location-error";
        errorDiv.textContent = "Failed to fetch location. Please try again.";
        parent.appendChild(errorDiv);

        const retryBtn = document.createElement("button");
        retryBtn.className = "location-retry";
        retryBtn.textContent = "Retry Location";
        retryBtn.onclick = getUserLocation;
        parent.appendChild(retryBtn);
      });
  }, [LOCATION_API]);

  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.append("action", "process_contact");

    setFormVisible(false);
    setStatusVisible(true);
    setStatusTitle("Sending Message...");
    setStatusMessage("Please wait while we send your message.");
    setStatusIcon("spinner");

    fetch(`${API_BASE_URL}/backend/processes.php`, {
      method: "POST",
      body: fd,
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) {
          setStatusTitle("Message Sent!");
          setStatusMessage(data?.message);
          setStatusIcon("check");
          setTimeout(() => {
            (window as any).closeModal?.("contactModal");
            form.reset();
            setFormVisible(true);
            setStatusVisible(false);
          }, 5000);
        } else {
          throw new Error(data?.error || "Failed to send message");
        }
      })
      .catch((err) => {
        setStatusTitle("Message Failed");
        setStatusMessage(String(err?.message || err));
        setStatusIcon("times");
        setTimeout(() => {
          setFormVisible(true);
          setStatusVisible(false);
        }, 3000);
      });
  };

  return (
    <div className="modal" id="contactModal">
      <div className="modal-content">
        <span className="close-modal" data-modal="contactModal" onClick={onClose}>&times;</span>

        <div className="modal-header">
          <h2 className="modal-title">{website_config?.CONTACT_TITLE}</h2>
          <p className="modal-subtitle">{website_config?.CONTACT_SUBTITLE}</p>
        </div>

        <div className="modal-body">
          <div className="contact-info">
            <div className="contact-item">
              <i className="fas fa-envelope" />
              <div>
                <strong>Email:</strong>{" "}
                <a href={`mailto:${website_config?.CONTACT_EMAIL}`}>{website_config?.CONTACT_EMAIL}</a>
              </div>
            </div>
            <div className="contact-item">
              <i className="fas fa-phone" />
              <div>
                <strong>Phone:</strong>{" "}
                <a href={`tel:${website_config?.CONTACT_PHONE}`}>{website_config?.CONTACT_PHONE}</a>
              </div>
            </div>
            <div className="contact-item">
              <i className="fas fa-map-marker-alt" />
              <div>
                <strong>Address:</strong> <span>{website_config?.CONTACT_ADDRESS}</span>
              </div>
            </div>
            <div className="contact-item">
              <i className="fas fa-location-dot" />
              <div>
                <strong>Your Location:</strong> <span id="userLocation" ref={locationRef} />
              </div>
            </div>
          </div>

          {formVisible && (
            <form id="contactForm" onSubmit={onSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contactName">{website_config?.CONTACT_NAME_LABEL}</label>
                  <input type="text" id="contactName" name="contact_name" required />
                </div>

                <div className="form-group">
                  <label htmlFor="contactEmail">{website_config?.CONTACT_EMAIL_LABEL}</label>
                  <input type="email" id="contactEmail" name="contact_email" required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="contactSubject">{website_config?.CONTACT_SUBJECT_LABEL}</label>
                <input type="text" id="contactSubject" name="contact_subject" required />
              </div>

              <div className="form-group">
                <label htmlFor="contactMessage">{website_config?.CONTACT_MESSAGE_LABEL}</label>
                <textarea id="contactMessage" name="contact_message" rows={5} required />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-paper-plane" /> {website_config?.CONTACT_SUBMIT_BUTTON}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => (window as any).closeModal?.("contactModal")}
                >
                  {website_config?.CONTACT_CANCEL}
                </button>
              </div>
            </form>
          )}

          {statusVisible && (
            <div id="contactStatus">
              <div className="contact-status">
                <div className="status-icon">
                  {statusIcon === "spinner" && <i className="fas fa-spinner fa-spin" />}
                  {statusIcon === "check" && <i className="fas fa-check-circle" style={{ color: "#4ade80" }} />}
                  {statusIcon === "times" && <i className="fas fa-times-circle" style={{ color: "#f87171" }} />}
                </div>
                <h3 id="contactStatusTitle">{statusTitle}</h3>
                <p id="contactStatusMessage">{statusMessage}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalContact;
