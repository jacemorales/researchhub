import { UseConfig } from "../../hooks/UseConfig";
interface ModalProps {onClose: () => void;}

const ModalAbout = ({ onClose }: ModalProps) => {
  const { config } = UseConfig();

  return (
    <div className="modal" id="aboutModal">
      <div className="modal-content">
        <span className="close-modal" onClick={onClose}>×</span>

        <div className="modal-header">
          <h2 className="modal-title">About {config?.SITE_NAME}</h2>
          <p className="modal-subtitle">{config?.ABOUT_SUBTITLE}</p>
        </div>

        <div className="modal-body">
          <h3>{config?.ABOUT_STORY_TITLE}</h3>
          <p>{config?.ABOUT_STORY_CONTENT}</p>

          <h3>{config?.ABOUT_MISSION_TITLE}</h3>
          <p>{config?.ABOUT_MISSION_CONTENT}</p>

          <h3>{config?.ABOUT_TEAM_TITLE}</h3>
          <p>{config?.ABOUT_TEAM_INTRO}</p>

          <div className="team-grid">
            <div className="team-member">
              <img src={config?.TEAM_MEMBER_1_IMG} alt={config?.TEAM_MEMBER_1_NAME} className="team-img" />
              <h4 className="team-name">{config?.TEAM_MEMBER_1_NAME}</h4>
              <p className="team-role">{config?.TEAM_MEMBER_1_ROLE}</p>
            </div>
            <div className="team-member">
              <img src={config?.TEAM_MEMBER_2_IMG} alt={config?.TEAM_MEMBER_2_NAME} className="team-img" />
              <h4 className="team-name">{config?.TEAM_MEMBER_2_NAME}</h4>
              <p className="team-role">{config?.TEAM_MEMBER_2_ROLE}</p>
            </div>
            <div className="team-member">
              <img src={config?.TEAM_MEMBER_3_IMG} alt={config?.TEAM_MEMBER_3_NAME} className="team-img" />
              <h4 className="team-name">{config?.TEAM_MEMBER_3_NAME}</h4>
              <p className="team-role">{config?.TEAM_MEMBER_3_ROLE}</p>
            </div>
            <div className="team-member">
              <img src={config?.TEAM_MEMBER_4_IMG} alt={config?.TEAM_MEMBER_4_NAME} className="team-img" />
              <h4 className="team-name">{config?.TEAM_MEMBER_4_NAME}</h4>
              <p className="team-role">{config?.TEAM_MEMBER_4_ROLE}</p>
            </div>
          </div>

          <h3>{config?.ABOUT_VALUES_TITLE}</h3>
          <ul>
            <li><strong>{config?.ABOUT_VALUE_1_TITLE}:</strong> {config?.ABOUT_VALUE_1_DESC}</li>
            <li><strong>{config?.ABOUT_VALUE_2_TITLE}:</strong> {config?.ABOUT_VALUE_2_DESC}</li>
            <li><strong>{config?.ABOUT_VALUE_3_TITLE}:</strong> {config?.ABOUT_VALUE_3_DESC}</li>
            <li><strong>{config?.ABOUT_VALUE_4_TITLE}:</strong> {config?.ABOUT_VALUE_4_DESC}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ModalAbout;
