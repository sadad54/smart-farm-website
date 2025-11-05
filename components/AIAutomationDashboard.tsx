"use client"

import { useState, useEffect } from 'react'
import { useEspContext } from '@/components/EspProvider'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Cog, Brain, Play, Pause, Plus, Edit, Trash2, Clock, Target, Zap } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

interface AutomationRule {
  id: string
  name: string
  description: string
  enabled: boolean
  trigger: {
    type: 'sensor' | 'schedule' | 'condition'
    sensor?: string
    operator?: string
    value?: number
    schedule?: string
  }
  action: {
    type: 'water' | 'light' | 'fan' | 'alert'
    duration?: number
    intensity?: number
    message?: string
  }
  conditions: {
    temperature_min?: number
    temperature_max?: number
    humidity_min?: number
    humidity_max?: number
    time_start?: string
    time_end?: string
  }
  lastTriggered?: Date
  executionCount: number
  aiEnabled: boolean
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
}

export function AIAutomationDashboard() {
  const { state, sendCommand } = useEspContext()
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [executionLog, setExecutionLog] = useState<any[]>([])
  
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    enabled: true,
    triggerType: 'sensor',
    triggerSensor: 'temperature',
    triggerOperator: 'greater_than',
    triggerValue: 25,
    actionType: 'water',
    actionDuration: 5,
    actionIntensity: 100,
    actionMessage: '',
    tempMin: 15,
    tempMax: 35,
    humidityMin: 30,
    humidityMax: 80,
    timeStart: '08:00',
    timeEnd: '20:00',
    aiEnabled: true,
    priority: 'medium'
  })

  // Initialize with some sample rules
  useEffect(() => {
    const sampleRules: AutomationRule[] = [
      {
        id: '1',
        name: 'Smart Watering',
        description: 'Waters plants when soil moisture drops below 30%',
        enabled: true,
        trigger: {
          type: 'sensor',
          sensor: 'soilHumidity',
          operator: 'less_than',
          value: 30
        },
        action: {
          type: 'water',
          duration: 5
        },
        conditions: {
          temperature_min: 15,
          temperature_max: 40,
          time_start: '06:00',
          time_end: '21:00'
        },
        executionCount: 12,
        aiEnabled: true,
        priority: 'high',
        createdAt: new Date(Date.now() - 86400000)
      },
      {
        id: '2',
        name: 'Night Light Control',
        description: 'Turns off grow lights after sunset',
        enabled: true,
        trigger: {
          type: 'schedule',
          schedule: '20:00'
        },
        action: {
          type: 'light',
          duration: 0
        },
        conditions: {},
        executionCount: 7,
        aiEnabled: false,
        priority: 'medium',
        createdAt: new Date(Date.now() - 172800000)
      },
      {
        id: '3',
        name: 'Temperature Alert',
        description: 'Sends alert when temperature is too high',
        enabled: true,
        trigger: {
          type: 'sensor',
          sensor: 'temperature',
          operator: 'greater_than',
          value: 35
        },
        action: {
          type: 'alert',
          message: 'Temperature too high! Consider ventilation.'
        },
        conditions: {},
        executionCount: 3,
        aiEnabled: true,
        priority: 'high',
        createdAt: new Date(Date.now() - 259200000)
      }
    ]
    
    setRules(sampleRules)
  }, [])

  // Check rules against current sensor data
  useEffect(() => {
    rules.forEach(rule => {
      if (rule.enabled) {
        checkRuleExecution(rule)
      }
    })
  }, [state, rules])

  const checkRuleExecution = async (rule: AutomationRule) => {
    let shouldExecute = false

    // Check trigger condition
    if (rule.trigger.type === 'sensor' && rule.trigger.sensor) {
      const sensorValue = state[rule.trigger.sensor as keyof typeof state] as number
      if (sensorValue !== undefined && sensorValue !== null) {
        switch (rule.trigger.operator) {
          case 'greater_than':
            shouldExecute = sensorValue > (rule.trigger.value || 0)
            break
          case 'less_than':
            shouldExecute = sensorValue < (rule.trigger.value || 0)
            break
          case 'equals':
            shouldExecute = sensorValue === rule.trigger.value
            break
        }
      }
    }

    // Check additional conditions
    if (shouldExecute) {
      const now = new Date()
      const currentTime = now.toTimeString().slice(0, 5)
      
      if (rule.conditions.time_start && rule.conditions.time_end) {
        shouldExecute = currentTime >= rule.conditions.time_start && currentTime <= rule.conditions.time_end
      }
      
      if (rule.conditions.temperature_min && state.temperature) {
        shouldExecute = shouldExecute && state.temperature >= rule.conditions.temperature_min
      }
      
      if (rule.conditions.temperature_max && state.temperature) {
        shouldExecute = shouldExecute && state.temperature <= rule.conditions.temperature_max
      }
    }

    // Prevent too frequent execution (at least 5 minutes between executions)
    if (shouldExecute && rule.lastTriggered) {
      const timeSinceLastExecution = Date.now() - rule.lastTriggered.getTime()
      if (timeSinceLastExecution < 300000) { // 5 minutes
        shouldExecute = false
      }
    }

    if (shouldExecute) {
      await executeRule(rule)
    }
  }

  const executeRule = async (rule: AutomationRule) => {
    console.log(`🤖 Executing automation rule: ${rule.name}`)
    
    try {
      // Execute the action
      switch (rule.action.type) {
        case 'water':
          await sendCommand('D', 'automation', {
            rule_id: rule.id,
            rule_name: rule.name,
            ai_triggered: rule.aiEnabled,
            duration: rule.action.duration || 5
          })
          break
        case 'light':
          await sendCommand('A', 'automation', {
            rule_id: rule.id,
            rule_name: rule.name,
            ai_triggered: rule.aiEnabled
          })
          break
        case 'fan':
          await sendCommand('B', 'automation', {
            rule_id: rule.id,
            rule_name: rule.name,
            ai_triggered: rule.aiEnabled
          })
          break
        case 'alert':
          console.log(`🔔 Alert: ${rule.action.message}`)
          break
      }

      // Update rule execution stats
      setRules(prev => prev.map(r => 
        r.id === rule.id 
          ? { ...r, lastTriggered: new Date(), executionCount: r.executionCount + 1 }
          : r
      ))

      // Log execution
      setExecutionLog(prev => [{
        ruleId: rule.id,
        ruleName: rule.name,
        action: rule.action.type,
        timestamp: new Date(),
        sensorData: { ...state }
      }, ...prev.slice(0, 9)]) // Keep last 10 executions

    } catch (error) {
      console.error(`❌ Failed to execute rule ${rule.name}:`, error)
    }
  }

  const createRule = () => {
    const newRule: AutomationRule = {
      id: Date.now().toString(),
      name: ruleForm.name,
      description: ruleForm.description,
      enabled: ruleForm.enabled,
      trigger: {
        type: ruleForm.triggerType as any,
        sensor: ruleForm.triggerSensor,
        operator: ruleForm.triggerOperator,
        value: ruleForm.triggerValue,
        schedule: ruleForm.triggerType === 'schedule' ? ruleForm.timeStart : undefined
      },
      action: {
        type: ruleForm.actionType as any,
        duration: ruleForm.actionDuration,
        intensity: ruleForm.actionIntensity,
        message: ruleForm.actionMessage
      },
      conditions: {
        temperature_min: ruleForm.tempMin,
        temperature_max: ruleForm.tempMax,
        humidity_min: ruleForm.humidityMin,
        humidity_max: ruleForm.humidityMax,
        time_start: ruleForm.timeStart,
        time_end: ruleForm.timeEnd
      },
      executionCount: 0,
      aiEnabled: ruleForm.aiEnabled,
      priority: ruleForm.priority as any,
      createdAt: new Date()
    }

    setRules(prev => [...prev, newRule])
    setShowCreateModal(false)
    resetForm()
  }

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ))
  }

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(rule => rule.id !== id))
  }

  const resetForm = () => {
    setRuleForm({
      name: '',
      description: '',
      enabled: true,
      triggerType: 'sensor',
      triggerSensor: 'temperature',
      triggerOperator: 'greater_than',
      triggerValue: 25,
      actionType: 'water',
      actionDuration: 5,
      actionIntensity: 100,
      actionMessage: '',
      tempMin: 15,
      tempMax: 35,
      humidityMin: 30,
      humidityMax: 80,
      timeStart: '08:00',
      timeEnd: '20:00',
      aiEnabled: true,
      priority: 'medium'
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'water': return '💧'
      case 'light': return '💡'
      case 'fan': return '🌪️'
      case 'alert': return '🔔'
      default: return '⚡'
    }
  }

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-4 border-indigo-400 rounded-3xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
            <Cog className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-indigo-900">AI Automation</h3>
            <p className="text-indigo-600">Smart Farm Rules Engine</p>
          </div>
        </div>
        
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-500 hover:bg-indigo-600">
              <Plus className="w-4 h-4 mr-2" />
              New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Automation Rule</DialogTitle>
              <DialogDescription>Define conditions and actions for your smart farm automation</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Rule Name</Label>
                  <Input
                    id="name"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Smart Watering"
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={ruleForm.priority} onValueChange={(value) => setRuleForm(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this rule does..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Trigger Sensor</Label>
                  <Select value={ruleForm.triggerSensor} onValueChange={(value) => setRuleForm(prev => ({ ...prev, triggerSensor: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="temperature">Temperature</SelectItem>
                      <SelectItem value="humidity">Humidity</SelectItem>
                      <SelectItem value="soilHumidity">Soil Moisture</SelectItem>
                      <SelectItem value="light">Light Level</SelectItem>
                      <SelectItem value="waterLevel">Water Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Condition</Label>
                  <Select value={ruleForm.triggerOperator} onValueChange={(value) => setRuleForm(prev => ({ ...prev, triggerOperator: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="greater_than">Greater than</SelectItem>
                      <SelectItem value="less_than">Less than</SelectItem>
                      <SelectItem value="equals">Equals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Value</Label>
                  <Input
                    type="number"
                    value={ruleForm.triggerValue}
                    onChange={(e) => setRuleForm(prev => ({ ...prev, triggerValue: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Action</Label>
                  <Select value={ruleForm.actionType} onValueChange={(value) => setRuleForm(prev => ({ ...prev, actionType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="water">Water Plants</SelectItem>
                      <SelectItem value="light">Toggle Light</SelectItem>
                      <SelectItem value="fan">Toggle Fan</SelectItem>
                      <SelectItem value="alert">Send Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {ruleForm.actionType === 'water' && (
                  <div>
                    <Label>Duration (seconds)</Label>
                    <Input
                      type="number"
                      value={ruleForm.actionDuration}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, actionDuration: parseInt(e.target.value) }))}
                    />
                  </div>
                )}
                
                {ruleForm.actionType === 'alert' && (
                  <div>
                    <Label>Alert Message</Label>
                    <Input
                      value={ruleForm.actionMessage}
                      onChange={(e) => setRuleForm(prev => ({ ...prev, actionMessage: e.target.value }))}
                      placeholder="Alert message..."
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="aiEnabled"
                  checked={ruleForm.aiEnabled}
                  onCheckedChange={(checked) => setRuleForm(prev => ({ ...prev, aiEnabled: checked }))}
                />
                <Label htmlFor="aiEnabled">Enable AI Enhancement</Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={createRule} className="flex-1">Create Rule</Button>
                <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Rules */}
      <div className="space-y-4 mb-6">
        <h4 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Active Rules ({rules.filter(r => r.enabled).length})
        </h4>
        
        {rules.length === 0 ? (
          <div className="text-center py-8 bg-white/50 rounded-2xl">
            <Brain className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
            <p className="text-indigo-600">No automation rules created yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="bg-white/70 rounded-2xl p-4 border border-indigo-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h5 className="font-bold text-indigo-900">{rule.name}</h5>
                      <Badge className={`${getPriorityColor(rule.priority)} text-white`}>
                        {rule.priority}
                      </Badge>
                      {rule.aiEnabled && (
                        <Badge variant="outline" className="border-purple-500 text-purple-700">
                          <Brain className="w-3 h-3 mr-1" />
                          AI
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{rule.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>Trigger: {rule.trigger.sensor} {rule.trigger.operator?.replace('_', ' ')} {rule.trigger.value}</span>
                      <span>Action: {getActionIcon(rule.action.type)} {rule.action.type}</span>
                      <span>Executions: {rule.executionCount}</span>
                      {rule.lastTriggered && (
                        <span>Last: {rule.lastTriggered.toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleRule(rule.id)}
                      className={rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
                    >
                      {rule.enabled ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteRule(rule.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Execution Log */}
      {executionLog.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-indigo-900 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Executions
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {executionLog.map((log, index) => (
              <div key={index} className="bg-indigo-50 rounded-lg p-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{log.ruleName}</span>
                  <span className="text-indigo-600">{log.timestamp.toLocaleTimeString()}</span>
                </div>
                <div className="text-gray-600 mt-1">
                  Executed: {getActionIcon(log.action)} {log.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}