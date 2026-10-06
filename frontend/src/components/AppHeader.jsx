import {
  useNavigate,
} from "react-router-dom";

import {
  useTranslation,
} from "react-i18next";

function AppHeader({
  worldName = null,
  showBackButton = false,
}) {
  const navigate =
    useNavigate();

  const {
    t,
    i18n,
  } = useTranslation();

  function changeLanguage(event) {
    const language =
      event.target.value;

    i18n.changeLanguage(language);

    localStorage.setItem(
      "mimoria-language",
      language
    );
  }

  return (
    <header className="workspace-topbar">
      <div className="workspace-topbar-left">
        {showBackButton && (
          <button
            className="back-button"
            onClick={() =>
              navigate("/")
            }
            aria-label="Back to worlds"
          >
            ←
          </button>
        )}

        <div
          className="logo"
          onClick={() =>
            navigate("/")
          }
          role="button"
          tabIndex={0}
        >
          {t("app.name")}
        </div>

        {worldName && (
          <>
            <div className="world-title-divider">
              /
            </div>

            <div className="workspace-world-name">
              {worldName}
            </div>
          </>
        )}
      </div>

      <div className="language-selector">
        <select
          value={i18n.language}
          onChange={
            changeLanguage
          }
          aria-label="Language"
        >
          <option value="en">
            English
          </option>

          <option value="zh-CN">
            简体中文
          </option>
        </select>
      </div>
    </header>
  );
}

export default AppHeader;