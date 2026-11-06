import { Link } from "react-router-dom";
import { useState } from "react";

import Project from "../components/Project";

const initialHardware = [
  { name: "HWSet1", capacity: 100, available: 75 },
  { name: "HWSet2", capacity: 100, available: 90 },
];

const initialProjects = [
  {
    id: "SDP-461",
    name: "Senior Design Prototype",
    description: "Prototype development for the senior design team.",
    relationship: "owner",
    members: ["jasmine", "Annie", "Sydney"],
    checkedOut: { HWSet1: 20, HWSet2: 10 },
  },
  {
    id: "LAB-204",
    name: "Embedded Systems Lab",
    description: "Testing sensors and embedded controllers.",
    relationship: "member",
    members: ["jasmine", "Alex"],
    checkedOut: { HWSet1: 5, HWSet2: 0 },
  },
  {
    id: "ROBOT-310",
    name: "Robotics Project",
    description: "Hardware resources for the robotics prototype.",
    relationship: "available",
    members: ["Morgan"],
    checkedOut: { HWSet1: 0, HWSet2: 0 },
  },
];

function HomePage() {
  const [hardware, setHardware] = useState(initialHardware);
  const [projects, setProjects] = useState(initialProjects);

  const updateHardware = (projectId, hardwareName, quantityChange) => {
    setHardware((items) => items.map((item) => (
      item.name === hardwareName
        ? { ...item, available: item.available - quantityChange }
        : item
    )));

    setProjects((items) => items.map((project) => (
      project.id === projectId
        ? {
          ...project,
          checkedOut: {
            ...project.checkedOut,
            [hardwareName]: project.checkedOut[hardwareName] + quantityChange,
          },
        }
        : project
    )));
  };

  const updateMembership = (projectId, relationship) => {
    setProjects((items) => items.map((project) => {
      if (project.id !== projectId || project.relationship === "owner") {
        return project;
      }

      return {
        ...project,
        relationship,
        members: relationship === "member"
          ? [...project.members, "jasmine"]
          : project.members.filter((member) => member !== "jasmine"),
      };
    }));
  };

  const updateProject = (projectId, updates) => {
    setProjects((items) => items.map((project) => (
      project.id === projectId ? { ...project, ...updates } : project
    )));
  };

  const myProjects = projects.filter((project) => project.relationship !== "available");
  const availableProjects = projects.filter((project) => project.relationship === "available");

  return (
    <section className="checkout-page">
      <h1 className="page-title">My Dashboard</h1>

      <div className="dashboard-content">
        <p>Welcome to HardwareShare! Manage your projects and hardware resources.</p>

        <section aria-labelledby="projects-title">
          <div className="projects-heading">
            <h2 id="projects-title">My Projects</h2>
            <Link className="create-project-link" to="/projects/new">+ Create Project</Link>
          </div>

          <div className="project-list">
            {myProjects.map((project) => (
              <Project
                key={project.id}
                project={project}
                hardware={hardware}
                onUpdateHardware={updateHardware}
                onUpdateMembership={updateMembership}
                onUpdateProject={updateProject}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="available-projects-title">
          <h2 id="available-projects-title" className="project-section-title">Available Projects</h2>
          <div className="project-list">
            {availableProjects.map((project) => (
              <Project
                key={project.id}
                project={project}
                hardware={hardware}
                onUpdateHardware={updateHardware}
                onUpdateMembership={updateMembership}
                onUpdateProject={updateProject}
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

export default HomePage;
