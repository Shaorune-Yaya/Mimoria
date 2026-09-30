import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [worlds, setWorlds] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // 从后端读取所有世界
  async function fetchWorlds() {
    try {
      const response = await fetch("http://localhost:3000/api/worlds");

      if (!response.ok) {
        throw new Error("Failed to fetch worlds");
      }

      const data = await response.json();

      setWorlds(data);
    } catch (error) {
      console.error(error);
    }
  }

  // 创建新世界
  async function createWorld(event) {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/worlds", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: name,
          description: description,
          icon: "🌍",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create world");
      }

      const newWorld = await response.json();

      // 把新创建的 World 加到页面最前面
      setWorlds((currentWorlds) => [
        newWorld,
        ...currentWorlds,
      ]);

      // 清空输入框
      setName("");
      setDescription("");

      // 关闭创建窗口
      setShowCreateForm(false);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    fetchWorlds();
  }, []);

  return (
    <div className="app">

      <header className="topbar">
        <div className="logo">
          WorldForge
        </div>
      </header>


      <main className="main-content">

        <div className="page-header">
          <div>
            <h1>当前世界</h1>

            <p>
              在这里创建和管理你的世界。
            </p>
          </div>

          <button
            className="create-button"
            onClick={() => setShowCreateForm(true)}
          >
            + 新建世界
          </button>
        </div>


        {showCreateForm && (
          <div className="create-panel">

            <h2>创建一个新世界</h2>

            <form onSubmit={createWorld}>

              <label>
                世界名称
              </label>

              <input
                type="text"
                placeholder="打算叫什么呢？"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
              />


              <label>
                世界描述
              </label>

              <textarea
                placeholder="这个世界是什么样子的呢？"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
              />


              <div className="form-buttons">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={() =>
                    setShowCreateForm(false)
                  }
                >
                  取消
                </button>

                <button
                  type="submit"
                  className="save-button"
                >
                  确认创建世界
                </button>

              </div>

            </form>

          </div>
        )}


        <div className="world-grid">

          {worlds.map((world) => (
            <div
              className="world-card"
              key={world._id}
            >

              <div className="world-icon">
                {world.icon || "🌍"}
              </div>

              <div className="world-info">

                <h2>
                  {world.name}
                </h2>

                <p>
                  {world.description ||
                    "No description yet."}
                </p>

                <span className="updated-time">
                  Updated{" "}
                  {new Date(
                    world.updatedAt
                  ).toLocaleDateString()}
                </span>

              </div>

            </div>
          ))}

        </div>


        {worlds.length === 0 && (
          <div className="empty-state">

            <h2>暂无世界</h2>

            <p>
              创建你的第一个世界来开始吧。
            </p>

          </div>
        )}

      </main>

    </div>
  );
}

export default App;