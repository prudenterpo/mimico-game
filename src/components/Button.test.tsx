import React from "react";
import { render, screen } from "@testing-library/react";
import Button from "./Button";

describe("Button", () => {
  it("disables the button while loading", () => {
    render(<Button isLoading>Salvar</Button>);

    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });
});
