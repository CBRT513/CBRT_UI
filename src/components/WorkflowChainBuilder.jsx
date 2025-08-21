/**
 * Workflow Chain Builder Component
 */

import React, { useState, useCallback } from 'react';
import { workflowEngine, WorkflowStep, StepType, Approver } from '../lib/workflows';
import { useAuth } from '../contexts/AuthContext';

export default function WorkflowChainBuilder({ onSave, initialChain = null }) {
  const { user } = useAuth();
  const [name, setName] = useState(initialChain?.name || '');
  const [description, setDescription] = useState(initialChain?.description || '');
  const [steps, setSteps] = useState(initialChain?.steps || []);
  const [editingStep, setEditingStep] = useState(null);
  const [showStepEditor, setShowStepEditor] = useState(false);

  const handleAddStep = useCallback(() => {
    const newStep = {
      id: `step_${Date.now()}`,
      name: '',
      type: StepType.APPROVAL,
      mode: 'sequential',
      approvers: [],
      actions: [],
      nextSteps: [],
    };
    setEditingStep(newStep);
    setShowStepEditor(true);
  }, []);

  const handleEditStep = useCallback((step) => {
    setEditingStep(step);
    setShowStepEditor(true);
  }, []);

  const handleSaveStep = useCallback((step) => {
    if (editingStep && steps.find(s => s.id === editingStep.id)) {
      // Update existing step
      setSteps(steps.map(s => s.id === step.id ? step : s));
    } else {
      // Add new step
      setSteps([...steps, step]);
    }
    setShowStepEditor(false);
    setEditingStep(null);
  }, [editingStep, steps]);

  const handleDeleteStep = useCallback((stepId) => {
    setSteps(steps.filter(s => s.id !== stepId));
    // Remove references from other steps
    setSteps(prev => prev.map(s => ({
      ...s,
      nextSteps: s.nextSteps.filter(id => id !== stepId),
    })));
  }, [steps]);

  const handleSaveChain = useCallback(async () => {
    if (!name || steps.length === 0) {
      alert('Please provide a name and at least one step');
      return;
    }

    try {
      const chain = await workflowEngine.createChain(
        name,
        steps,
        user.workspaceId,
        user.id,
        { description }
      );
      
      if (onSave) {
        onSave(chain);
      }
    } catch (error) {
      console.error('Failed to save workflow chain:', error);
      alert('Failed to save workflow chain');
    }
  }, [name, description, steps, user, onSave]);

  const moveStep = useCallback((index, direction) => {
    const newSteps = [...steps];
    const newIndex = index + direction;
    
    if (newIndex >= 0 && newIndex < newSteps.length) {
      [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
      setSteps(newSteps);
    }
  }, [steps]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Workflow Chain Builder</h2>

      {/* Chain Details */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Workflow Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter workflow name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Describe the workflow purpose"
          />
        </div>
      </div>

      {/* Steps */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Workflow Steps</h3>
          <button
            onClick={handleAddStep}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Step
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No steps added yet</p>
            <button
              onClick={handleAddStep}
              className="mt-2 text-blue-600 hover:underline"
            >
              Add your first step
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                totalSteps={steps.length}
                onEdit={() => handleEditStep(step)}
                onDelete={() => handleDeleteStep(step.id)}
                onMoveUp={() => moveStep(index, -1)}
                onMoveDown={() => moveStep(index, 1)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveChain}
          disabled={!name || steps.length === 0}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Workflow
        </button>
      </div>

      {/* Step Editor Modal */}
      {showStepEditor && (
        <StepEditor
          step={editingStep}
          allSteps={steps}
          onSave={handleSaveStep}
          onClose={() => {
            setShowStepEditor(false);
            setEditingStep(null);
          }}
        />
      )}
    </div>
  );
}

function StepCard({ step, index, totalSteps, onEdit, onDelete, onMoveUp, onMoveDown }) {
  const getStepTypeIcon = (type) => {
    switch (type) {
      case StepType.APPROVAL:
        return '✓';
      case StepType.NOTIFICATION:
        return '📧';
      case StepType.AUTOMATED:
        return '⚙️';
      case StepType.CONDITIONAL:
        return '🔀';
      case StepType.MANUAL_TASK:
        return '📝';
      default:
        return '?';
    }
  };

  const getStepTypeColor = (type) => {
    switch (type) {
      case StepType.APPROVAL:
        return 'bg-green-100 text-green-800';
      case StepType.NOTIFICATION:
        return 'bg-blue-100 text-blue-800';
      case StepType.AUTOMATED:
        return 'bg-purple-100 text-purple-800';
      case StepType.CONDITIONAL:
        return 'bg-yellow-100 text-yellow-800';
      case StepType.MANUAL_TASK:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex items-center p-4 bg-white border rounded-lg hover:shadow-md transition-shadow">
      {/* Step Number */}
      <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-semibold">
        {index + 1}
      </div>

      {/* Step Info */}
      <div className="flex-grow ml-4">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded text-sm font-medium ${getStepTypeColor(step.type)}`}>
            {getStepTypeIcon(step.type)} {step.type}
          </span>
          <h4 className="font-semibold">{step.name || 'Unnamed Step'}</h4>
        </div>
        
        <div className="mt-1 text-sm text-gray-600">
          {step.mode === 'parallel' ? 'Parallel' : 'Sequential'} • 
          {step.approvers.length} approver(s)
          {step.timeout && ` • Timeout: ${step.timeout / 1000}s`}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          title="Move up"
        >
          ↑
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === totalSteps - 1}
          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          title="Move down"
        >
          ↓
        </button>
        <button
          onClick={onEdit}
          className="p-1 text-blue-600 hover:text-blue-800"
          title="Edit"
        >
          ✏️
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-red-600 hover:text-red-800"
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

function StepEditor({ step, allSteps, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: step.name || '',
    type: step.type || StepType.APPROVAL,
    mode: step.mode || 'sequential',
    approvers: step.approvers || [],
    timeout: step.timeout ? step.timeout / 1000 : '',
    escalation: step.escalation || null,
    autoApprove: step.autoApprove || null,
    nextSteps: step.nextSteps || [],
  });

  const [newApprover, setNewApprover] = useState({ type: 'user', value: '' });

  const handleAddApprover = () => {
    if (newApprover.value) {
      setFormData({
        ...formData,
        approvers: [...formData.approvers, { ...newApprover }],
      });
      setNewApprover({ type: 'user', value: '' });
    }
  };

  const handleRemoveApprover = (index) => {
    setFormData({
      ...formData,
      approvers: formData.approvers.filter((_, i) => i !== index),
    });
  };

  const handleSave = () => {
    const updatedStep = {
      ...step,
      ...formData,
      timeout: formData.timeout ? parseInt(formData.timeout) * 1000 : undefined,
    };
    onSave(updatedStep);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-xl font-bold mb-4">Edit Step</h3>

        <div className="space-y-4">
          {/* Step Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Step Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Enter step name"
            />
          </div>

          {/* Step Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Step Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value={StepType.APPROVAL}>Approval</option>
              <option value={StepType.NOTIFICATION}>Notification</option>
              <option value={StepType.AUTOMATED}>Automated</option>
              <option value={StepType.CONDITIONAL}>Conditional</option>
              <option value={StepType.MANUAL_TASK}>Manual Task</option>
            </select>
          </div>

          {/* Execution Mode */}
          <div>
            <label className="block text-sm font-medium mb-1">Execution Mode</label>
            <select
              value={formData.mode}
              onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="sequential">Sequential</option>
              <option value="parallel">Parallel</option>
            </select>
          </div>

          {/* Timeout */}
          <div>
            <label className="block text-sm font-medium mb-1">Timeout (seconds)</label>
            <input
              type="number"
              value={formData.timeout}
              onChange={(e) => setFormData({ ...formData, timeout: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Optional timeout in seconds"
            />
          </div>

          {/* Approvers */}
          <div>
            <label className="block text-sm font-medium mb-1">Approvers</label>
            
            {/* Existing Approvers */}
            {formData.approvers.length > 0 && (
              <div className="mb-2 space-y-1">
                {formData.approvers.map((approver, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">
                      {approver.type}: {approver.value}
                      {approver.isOptional && ' (Optional)'}
                    </span>
                    <button
                      onClick={() => handleRemoveApprover(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Approver */}
            <div className="flex space-x-2">
              <select
                value={newApprover.type}
                onChange={(e) => setNewApprover({ ...newApprover, type: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="user">User</option>
                <option value="role">Role</option>
                <option value="group">Group</option>
                <option value="dynamic">Dynamic</option>
              </select>
              <input
                type="text"
                value={newApprover.value}
                onChange={(e) => setNewApprover({ ...newApprover, value: e.target.value })}
                className="flex-grow px-3 py-2 border rounded-lg"
                placeholder="Enter user ID, role, or expression"
              />
              <button
                onClick={handleAddApprover}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Next Steps */}
          <div>
            <label className="block text-sm font-medium mb-1">Next Steps</label>
            <select
              multiple
              value={formData.nextSteps}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setFormData({ ...formData, nextSteps: selected });
              }}
              className="w-full px-3 py-2 border rounded-lg"
              size={3}
            >
              {allSteps
                .filter(s => s.id !== step.id)
                .map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name || 'Unnamed Step'}
                  </option>
                ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Step
          </button>
        </div>
      </div>
    </div>
  );
}