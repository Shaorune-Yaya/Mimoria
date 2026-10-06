import {
  useNavigate,
} from "react-router-dom";

import {
  useTranslation,
} from "react-i18next";

function AppHeader({
  worldName = null,
  showBackButton = false,
  backTo = "/",
  showMenuButton = false,
  onMenuClick = null,
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

    i18n.changeLanguage(
      language
    );

    localStorage.setItem(
      "mimoria-language",
      language
    );
  }

  return (
    <header className="workspace-topbar">
      <div className="workspace-topbar-left">
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
      </div>
    </header>
  );
}

export default AppHeader;