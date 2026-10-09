import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useTranslation,
} from "react-i18next";

import {
  useAuth,
} from "../auth/AuthContext";


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
  } =
    useTranslation();


  const {
    user,
    logout,
  } =
    useAuth();


  const [
    accountOpen,
    setAccountOpen,
  ] =
    useState(
      false
    );


  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(
      false
    );


  const accountRef =
    useRef(
      null
    );


  // ======================================================
  // Language
  // ======================================================

  function changeLanguage(
    event
  ) {
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


  // ======================================================
  // Account Menu
  // ======================================================

  useEffect(
    () => {
      if (
        !accountOpen
      ) {
        return;
      }


      function handleOutsideClick(
        event
      ) {
        if (
          accountRef.current &&
          !accountRef.current.contains(
            event.target
          )
        ) {
          setAccountOpen(
            false
          );
        }
      }


      document.addEventListener(
        "pointerdown",
        handleOutsideClick
      );


      return () => {
        document.removeEventListener(
          "pointerdown",
          handleOutsideClick
        );
      };
    },
    [
      accountOpen,
    ]
  );


  async function handleLogout() {
    if (
      loggingOut
    ) {
      return;
    }


    try {
      setLoggingOut(
        true
      );


      await logout();


      navigate(
        "/login",
        {
          replace:
            true,
        }
      );
    } finally {
      setLoggingOut(
        false
      );
    }
  }


  const accountLabel =
    user?.displayName ||
    user?.username ||
    t(
      "auth.account"
    );


  // ======================================================
  // Render
  // ======================================================

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
              navigate(
                backTo
              )
            }
            aria-label="Back"
          >
            ←
          </button>
        )}


        <div
          className="logo"
          onClick={() =>
            navigate(
              "/"
            )
          }
          role="button"
          tabIndex={0}
        >
          {t(
            "app.name"
          )}
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


        {user && (
          <div
            className="account-menu"
            ref={
              accountRef
            }
          >
            <button
              type="button"
              className="account-menu-trigger"
              onClick={() =>
                setAccountOpen(
                  (current) =>
                    !current
                )
              }
              aria-expanded={
                accountOpen
              }
            >
              <span className="account-menu-avatar">
                {accountLabel
                  .slice(
                    0,
                    1
                  )
                  .toUpperCase()}
              </span>

              <span className="account-menu-name">
                {accountLabel}
              </span>

              <span className="account-menu-arrow">
                ▾
              </span>
            </button>


            {accountOpen && (
              <div className="account-menu-dropdown">
                <div className="account-menu-profile">
                  <strong>
                    {accountLabel}
                  </strong>

                  <span>
                    @{user.username}
                  </span>

                  <span>
                    {user.email}
                  </span>
                </div>


                <div className="account-menu-divider" />


                <button
                  type="button"
                  className="account-menu-item"
                  onClick={() => {
                    setAccountOpen(
                      false
                    );


                    navigate(
                      "/account"
                    );
                  }}
                >
                  {t(
                    "auth.account"
                  )}
                </button>


                <button
                  type="button"
                  className="account-menu-item danger"
                  disabled={
                    loggingOut
                  }
                  onClick={
                    handleLogout
                  }
                >
                  {loggingOut
                    ? t(
                        "auth.loggingOut"
                      )
                    : t(
                        "auth.logout"
                      )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}


export default AppHeader;