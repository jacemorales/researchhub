// src/components/ModalContact.tsx
import { useState } from "react";
import { useData } from "../../hooks/useData";
import { useCUD } from "../../hooks/useCUD";

interface ModalProps {onClose: () => void;}

const ModalContact = ({ onClose }: ModalProps) => {
  const { website_config } = useData();
  const { execute } = useCUD();

  const [formVisible, setFormVisible] = useState(true);
  const [statusVisible, setStatusVisible] = useState(false);
  const [statusTitle, setStatusTitle] = useState("Sending Message...");
  const [statusMessage, setStatusMessage] = useState("Please wait while we send your message.");
  const [statusIcon, setStatusIcon] = useState<"spinner" | "check" | "times">("spinner");

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const contactData = {
      contact_name: formData.get("contact_name") as string,
      contact_email: formData.get("contact_email") as string,
      contact_subject: formData.get("contact_subject") as string,
      contact_message: formData.get("contact_message") as string,
    };

    setFormVisible(false);
    setStatusVisible(true);
    setStatusTitle("Sending Message...");
    setStatusMessage("Please wait while we send your message.");
    setStatusIcon("spinner");

    try {
      const result = await execute(
        { table: 'contact_messages', action: 'insert' },
        contactData
      );

      if (result.success) {
        setStatusTitle("Message Sent!");
        setStatusMessage("Thank you for your message! We will get back to you soon.");
        setStatusIcon("check");
        setTimeout(() => {
          onClose();
          form.reset();
          setFormVisible(true);
          setStatusVisible(false);
        }, 5000);
      } else {
        throw new Error(result.error || "Failed to send message");
      }
    } catch (err) {
      setStatusTitle("Message Failed");
      setStatusMessage(String(err instanceof Error ? err.message : err));
      setStatusIcon("times");
      setTimeout(() => {
        setFormVisible(true);
        setStatusVisible(false);
      }, 3000);
    }
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
                  onClick={() => (window as Window & { closeModal?: (id: string) => void }).closeModal?.("contactModal")}
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
