import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CustomerManager from "../CustomerManager";

// Mock Firebase
jest.mock('../../firebase/config', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-uid' } }
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date())
}));

jest.mock('../../hooks/useFirestore', () => ({
  useFirestoreCollection: jest.fn(() => ({
    data: [],
    loading: false,
    error: null
  }))
}));

describe('CustomerManager', () => {
  test("Add Customer modal opens and closes via Cancel button", async () => {
    render(<CustomerManager />);
    
    // Open modal
    fireEvent.click(screen.getByText("+ Add Customer"));

    // Modal should be open
    expect(await screen.findByText("Add Customer")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Acme Steel")).toBeInTheDocument();

    // Click Cancel - should close
    fireEvent.click(screen.getByText("Cancel"));
    
    await waitFor(() => {
      expect(screen.queryByText("Add Customer")).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Acme Steel")).not.toBeInTheDocument();
    });
  });

  test("Add Customer modal closes via X button", async () => {
    render(<CustomerManager />);
    
    // Open modal
    fireEvent.click(screen.getByText("+ Add Customer"));

    // Modal should be open
    expect(await screen.findByText("Add Customer")).toBeInTheDocument();

    // Click X button - should close
    const closeButton = screen.getByLabelText("Close");
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByText("Add Customer")).not.toBeInTheDocument();
    });
  });

  test("Add Customer modal closes via Escape key", async () => {
    render(<CustomerManager />);
    
    // Open modal
    fireEvent.click(screen.getByText("+ Add Customer"));

    // Modal should be open
    expect(await screen.findByText("Add Customer")).toBeInTheDocument();

    // Press Escape - should close
    fireEvent.keyDown(document, { key: "Escape" });
    
    await waitFor(() => {
      expect(screen.queryByText("Add Customer")).not.toBeInTheDocument();
    });
  });

  test("Add Customer modal closes via overlay click", async () => {
    render(<CustomerManager />);
    
    // Open modal
    fireEvent.click(screen.getByText("+ Add Customer"));

    // Modal should be open
    expect(await screen.findByText("Add Customer")).toBeInTheDocument();

    // Click overlay (the dark background) - should close
    const overlay = document.querySelector('.bg-black\\/40');
    if (overlay) {
      fireEvent.click(overlay);
    }
    
    await waitFor(() => {
      expect(screen.queryByText("Add Customer")).not.toBeInTheDocument();
    });
  });

  test("Cancel button has type='button' to prevent form submission", async () => {
    render(<CustomerManager />);
    
    // Open modal
    fireEvent.click(screen.getByText("+ Add Customer"));

    // Find Cancel button and verify it has type="button"
    const cancelButton = await screen.findByText("Cancel");
    expect(cancelButton).toHaveAttribute("type", "button");
  });

  test("Save button is disabled when customer name is empty", async () => {
    render(<CustomerManager />);
    
    // Open modal
    fireEvent.click(screen.getByText("+ Add Customer"));

    // Save button should be disabled initially
    const saveButton = await screen.findByText("Save");
    expect(saveButton).toBeDisabled();

    // Type in customer name
    const nameInput = screen.getByPlaceholderText("Acme Steel");
    fireEvent.change(nameInput, { target: { value: "Test Customer" } });

    // Save button should now be enabled
    expect(saveButton).not.toBeDisabled();
  });
});