import {
  useNavigate,
} from "react-router-dom";

import {
  useTranslation,
} from "react-i18next";

function AppHeader({
  worldName = null,
  showBackButton = false,
<<<<<<< HEAD
  backTo = "/",
  showMenuButton = false,
  onMenuClick = null,
=======
>>>>>>> fa2ef0a5320c91de7599683e93ad00e0e3b5342d
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

<<<<<<< HEAD
    i18n.changeLanguage(
      language
    );
=======
    i18n.changeLanguage(language);
>>>>>>> fa2ef0a5320c91de7599683e93ad00e0e3b5342d

    localStorage.setItem(
      "mimoria-language",
      language
    );
  }

  return (
    <header className="workspace-topbar">
      <div className="workspace-topbar-left">
<<<<<<< HEAD
        {showMenuButton && (
          <button
            type="button"
            className="mobile-menu-button"
            onClick={
              onMenuClick
            }
            aria-label="Open navigation"
          >
            ☰
          </button>
        )}

        {showBackButton && (
          <button
            type="button"
            className="back-button"
            onClick={() =>
              navigate(backTo)
            }
            aria-label="Back"
=======
        {showBackButton && (
          <button
            className="back-button"
            onClick={() =>
              navigate("/")
            }
            aria-label="Back to worlds"
>>>>>>> fa2ef0a5320c91de7599683e93ad00e0e3b5342d
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

<<<<<<< HEAD
      <div className="workspace-topbar-right">
        <div className="language-selector">
          <select
            value={
              i18n.language
            }
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
=======
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
>>>>>>> fa2ef0a5320c91de7599683e93ad00e0e3b5342d
      </div>
    </header>
  );
}

export default AppHeader;