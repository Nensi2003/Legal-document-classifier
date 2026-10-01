import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { DynamicForm } from "../../features/documents/components/DynamicForm";

describe("DynamicForm", () => {
  it("renders fields from the schema", () => {
    render(
      <DynamicForm
        schema={{
          type: "object",
          properties: {
            firstName: {
              type: "string",
              title: "First Name",
            },
            age: {
              type: "number",
              title: "Age",
            },
          },
        }}
      />
    );

    expect(
      screen.getByText("First Name")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Age")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("textbox")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("spinbutton")
    ).toBeInTheDocument();
  });

  it("uses initial data for field values", () => {
    render(
      <DynamicForm
        schema={{
          type: "object",
          properties: {
            firstName: {
              type: "string",
            },
          },
        }}
        initialData={{
          firstName: "Nensi",
        }}
      />
    );

    expect(
      screen.getByDisplayValue("Nensi")
    ).toBeInTheDocument();
  });

  it("marks required fields", () => {
    render(
      <DynamicForm
        schema={{
          type: "object",
          properties: {
            firstName: {
              type: "string",
              title: "First Name",
            },
            email: {
              type: "string",
              title: "Email",
            },
          },
          required: ["firstName"],
        }}
      />
    );

    expect(
      screen.getByText("First Name")
    ).toBeInTheDocument();

    expect(
      screen.getByText("*")
    ).toBeInTheDocument();
  });

  it("calls onChange with updated data when a field changes", () => {
    const onChange = vi.fn();

    render(
      <DynamicForm
        schema={{
          type: "object",
          properties: {
            firstName: {
              type: "string",
            },
            lastName: {
              type: "string",
            },
          },
        }}
        initialData={{
          lastName: "Smith",
        }}
        onChange={onChange}
      />
    );

    const inputs = screen.getAllByRole("textbox");

    fireEvent.change(inputs[0], {
      target: {
        value: "Nensi",
      },
    });

    expect(onChange).toHaveBeenCalledWith({
      firstName: "Nensi",
      lastName: "Smith",
    });
  });

  it("preserves existing data when another field changes", () => {
    const onChange = vi.fn();

    render(
      <DynamicForm
        schema={{
          type: "object",
          properties: {
            name: {
              type: "string",
            },
            email: {
              type: "string",
              format: "email",
            },
          },
        }}
        initialData={{
          name: "Nensi",
          email: "old@example.com",
        }}
        onChange={onChange}
      />
    );

    const emailInput = screen.getByDisplayValue(
      "old@example.com"
    );

    fireEvent.change(emailInput, {
      target: {
        value: "new@example.com",
      },
    });

    expect(onChange).toHaveBeenCalledWith({
      name: "Nensi",
      email: "new@example.com",
    });
  });

  it("renders an empty form when the schema has no properties", () => {
    render(
      <DynamicForm
        schema={{
          type: "object",
          properties: {},
        }}
      />
    );

    expect(
      screen.queryByRole("textbox")
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("spinbutton")
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("checkbox")
    ).not.toBeInTheDocument();
  });
});