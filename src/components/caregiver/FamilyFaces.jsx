"use client";

import { useEffect, useState } from "react";
import "./FamilyFaces.css";
import { api } from "../../api/client";

function FamilyFaces() {
  const [tab, setTab] = useState("all");
  const [familyMembers, setFamilyMembers] = useState([]);
  const [recentRecognitions, setRecentRecognitions] = useState([]);
  const [unknownFaces, setUnknownFaces] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newFace, setNewFace] = useState({
    name: "",
    relation: "",
    email: "",
    primary: false,
    imageData: null,
  });
  const [labelForm, setLabelForm] = useState({
    show: false,
    id: "",
    name: "",
    relation: "",
    email: "",
    primary: false,
    imageData: null,
  });
  const [photoModal, setPhotoModal] = useState({ show: false, member: null });

  async function load() {
    try {
      const [family, recents, unknown] = await Promise.all([
        api.getFamily(),
        api.getRecentRecognitions(),
        api.getUnknownFaces(),
      ]);
      setFamilyMembers(family);
      setRecentRecognitions(recents);
      setUnknownFaces(unknown);
    } catch (e) {
      console.error("[v0] load family/recognitions failed", e);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const addFace = async (e) => {
    e.preventDefault();
    await api.addFamilyMember({
      name: newFace.name,
      relation: newFace.relation || "Friend",
      email: newFace.email,
      primary: newFace.primary,
      imageData: newFace.imageData,
    });
    setShowAdd(false);
    setNewFace({
      name: "",
      relation: "",
      email: "",
      primary: false,
      imageData: null,
    });
    await load();
  };

  const discardUnknown = async (id) => {
    await api.discardUnknownFace(id);
    await load();
  };

  const labelUnknown = async (e) => {
    e.preventDefault();
    await api.labelUnknownFace({
      id: labelForm.id,
      name: labelForm.name,
      relation: labelForm.relation || "Friend",
      email: labelForm.email,
      primary: labelForm.primary,
      imageData: labelForm.imageData,
    });
    setLabelForm({
      show: false,
      id: "",
      name: "",
      relation: "",
      email: "",
      primary: false,
      imageData: null,
    });
    await load();
  };

  return (
    <div className="family-faces">
      <div className="family-header">
        <div>
          <h1>Family & Face Management</h1>
          <p>Manage registered people and unknown faces</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setTab("all")}
            className={`tab-btn ${tab === "all" ? "active" : ""}`}
          >
            All Family
          </button>
          <button
            onClick={() => setTab("unknown")}
            className={`tab-btn ${tab === "unknown" ? "active" : ""}`}
          >
            Unknown Faces
          </button>
          <button className="add-member-btn" onClick={() => setShowAdd(true)}>
            + Add New Face
          </button>
        </div>
      </div>

      {showAdd && (
        <form
          onSubmit={addFace}
          className="mini-form"
          style={{
            background: "#0f172a",
            color: "#e2e8f0",
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Add New Face</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 8,
            }}
          >
            <input
              placeholder="Name"
              value={newFace.name}
              onChange={(e) => setNewFace({ ...newFace, name: e.target.value })}
              required
            />
            <input
              placeholder="Relation (Friend)"
              value={newFace.relation}
              onChange={(e) =>
                setNewFace({ ...newFace, relation: e.target.value })
              }
            />
            <input
              placeholder="Email"
              type="email"
              value={newFace.email}
              onChange={(e) =>
                setNewFace({ ...newFace, email: e.target.value })
              }
              required
            />
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={!!newFace.primary}
                onChange={(e) =>
                  setNewFace({ ...newFace, primary: e.target.checked })
                }
              />
              Make Primary
            </label>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 10,
              alignItems: "center",
            }}
          >
            <div>
              <label style={{ marginBottom: 6, display: "block" }}>Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () =>
                    setNewFace({ ...newFace, imageData: r.result });
                  r.readAsDataURL(f);
                }}
              />
            </div>
            <div style={{ justifySelf: "end" }}>
              {newFace.imageData && (
                <img
                  src={newFace.imageData || "/placeholder.svg"}
                  alt="Preview"
                  style={{
                    width: 72,
                    height: 72,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid #334155",
                  }}
                />
              )}
            </div>
          </div>
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            <button type="submit">Save</button>
            <button type="button" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {tab !== "unknown" && (
        <div className="family-grid">
          {familyMembers.map((member) => (
            <div key={member.id} className="family-card">
              <div className="family-photo">
                {member.imageData || member.photoUrl ? (
                  <img
                    alt={member.name}
                    src={member.imageData || member.photoUrl}
                    style={{
                      width: 64,
                      height: 64,
                      objectFit: "cover",
                      borderRadius: 10,
                    }}
                  />
                ) : (
                  member.photo
                )}
              </div>
              <div className="family-info">
                <h3>
                  {member.name}{" "}
                  {member.primary && (
                    <span style={{ fontSize: 12, color: "#10B981" }}>
                      (Primary)
                    </span>
                  )}
                </h3>
                <p className="family-relation">{member.relation}</p>
                <div className="family-contact">
                  <p>
                    <strong>Email</strong>
                  </p>
                  <p>{member.email}</p>
                </div>
                <div className="family-actions">
                  {!member.primary && member.email && (
                    <button
                      className="action-btn edit"
                      onClick={async () => {
                        await api.setPrimaryContact(member.email);
                        await load();
                      }}
                    >
                      Make Primary
                    </button>
                  )}
                  <button
                    className="action-btn photos"
                    onClick={() => setPhotoModal({ show: true, member })}
                  >
                    Photos
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "unknown" && (
        <div className="recent-recognitions-card">
          <h2>Unknown Faces</h2>
          <div className="recognitions-list">
            {unknownFaces.map((f) => (
              <div key={f.id} className="recognition-item">
                <div
                  className="recognition-details"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <img
                    alt="unknown"
                    src={f.imageData || "/placeholder.svg"}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 6,
                      objectFit: "cover",
                    }}
                  />
                  <div>
                    <div className="recognition-name">Unknown</div>
                    <div className="recognition-time">{f.capturedAt}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => discardUnknown(f.id)}>Discard</button>
                  <button
                    onClick={() =>
                      setLabelForm({
                        show: true,
                        id: f.id,
                        name: "",
                        relation: "",
                        email: "",
                        primary: false,
                        imageData: null,
                      })
                    }
                  >
                    Label & Save
                  </button>
                </div>
              </div>
            ))}
            {unknownFaces.length === 0 && (
              <div style={{ color: "#64748b" }}>
                No unknown faces to review.
              </div>
            )}
          </div>

          {labelForm.show && (
            <form
              onSubmit={labelUnknown}
              className="mini-form"
              style={{
                background: "#0f172a",
                color: "#e2e8f0",
                padding: 12,
                borderRadius: 8,
                marginTop: 12,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                <input
                  placeholder="Name"
                  value={labelForm.name}
                  onChange={(e) =>
                    setLabelForm({ ...labelForm, name: e.target.value })
                  }
                />
                <input
                  placeholder="Relation (Friend)"
                  value={labelForm.relation}
                  onChange={(e) =>
                    setLabelForm({ ...labelForm, relation: e.target.value })
                  }
                />
                <input
                  placeholder="Email"
                  type="email"
                  value={labelForm.email}
                  onChange={(e) =>
                    setLabelForm({ ...labelForm, email: e.target.value })
                  }
                />
                <label
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <input
                    type="checkbox"
                    checked={!!labelForm.primary}
                    onChange={(e) =>
                      setLabelForm({ ...labelForm, primary: e.target.checked })
                    }
                  />
                  Make Primary
                </label>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () =>
                      setLabelForm((lf) => ({ ...lf, imageData: r.result }));
                    r.readAsDataURL(f);
                  }}
                />
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button type="submit">Save</button>
                <button
                  type="button"
                  onClick={() =>
                    setLabelForm({
                      show: false,
                      id: "",
                      name: "",
                      relation: "",
                      email: "",
                    })
                  }
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {photoModal.show && photoModal.member && (
        <div
          className="photo-modal-overlay"
          onClick={() => setPhotoModal({ show: false, member: null })}
        >
          <div className="photo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="photo-modal-header">
              <div>
                <div className="photo-modal-title">
                  {photoModal.member.name}
                </div>
                <div className="photo-modal-sub">
                  {photoModal.member.relation}
                </div>
              </div>
              <button
                className="photo-modal-close"
                onClick={() => setPhotoModal({ show: false, member: null })}
              >
                Close
              </button>
            </div>
            <div className="photo-grid">
              {(photoModal.member.trainingImages || []).map((src, i) => (
                <div key={i} className="photo-cell">
                  <img
                    alt={`${photoModal.member.name} ${i + 1}`}
                    src={src || "/placeholder.svg"}
                  />
                </div>
              ))}
              {(!photoModal.member.trainingImages ||
                photoModal.member.trainingImages.length === 0) && (
                <div style={{ color: "#64748b", fontSize: 14 }}>
                  No training photos found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FamilyFaces;
