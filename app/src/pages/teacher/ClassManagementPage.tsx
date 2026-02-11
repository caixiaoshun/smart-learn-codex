import { useEffect, useState } from 'react';
import { useClassStore, type Class } from '@/stores/classStore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Plus, 
  Copy, 
  Trash2, 
  Edit2, 
  UserMinus, 
  BookOpen,
  GraduationCap,
} from 'lucide-react';

export function ClassManagementPage() {
  const { classes, isLoading, fetchTeacherClasses, createClass, updateClass, deleteClass, fetchClassDetail, removeStudent } = useClassStore();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [editClassName, setEditClassName] = useState('');
  const [editClassDesc, setEditClassDesc] = useState('');

  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    
    try {
      await createClass({ name: newClassName, description: newClassDesc });
      setIsCreateDialogOpen(false);
      setNewClassName('');
      setNewClassDesc('');
    } catch {
      // 错误已由全局拦截器处理并显示 Toast
    }
  };

  const handleUpdateClass = async () => {
    if (!selectedClass || !editClassName.trim()) return;
    
    try {
      await updateClass(selectedClass.id, { name: editClassName, description: editClassDesc });
      setIsEditDialogOpen(false);
      setSelectedClass(null);
    } catch {
      // 错误已由全局拦截器处理并显示 Toast
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('确定要删除这个班级吗？此操作不可恢复。')) return;
    
    try {
      await deleteClass(classId);
    } catch {
      // 错误已由全局拦截器处理并显示 Toast
    }
  };

  const handleCopyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('邀请码已复制到剪贴板');
  };

  const handleRemoveStudent = async (classId: string, studentId: string, studentName: string) => {
    if (!confirm(`确定要将 ${studentName} 从班级中移除吗？`)) return;
    
    try {
      await removeStudent(classId, studentId);
    } catch {
      // 错误已由全局拦截器处理并显示 Toast
    }
  };

  const openEditDialog = (cls: Class) => {
    setSelectedClass(cls);
    setEditClassName(cls.name);
    setEditClassDesc(cls.description || '');
    setIsEditDialogOpen(true);
  };

  const filteredClasses = classes;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">班级管理</h1>
          <p className="text-gray-600 mt-1">
            创建和管理您的班级，邀请学生加入
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              创建班级
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建新班级</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">班级名称</label>
                <Input
                  placeholder="例如：高二(3)班"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">班级描述（可选）</label>
                <Input
                  placeholder="例如：2024年秋季学期"
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                />
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleCreateClass}
                disabled={!newClassName.trim()}
              >
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>



      {/* 班级列表 */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-500 mt-4">加载中...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">暂无班级，点击上方按钮创建</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredClasses.map((cls) => (
            <Card key={cls.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{cls.name}</CardTitle>
                    {cls.description && (
                      <p className="text-sm text-gray-500 mt-1">{cls.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(cls)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteClass(cls.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 统计信息 */}
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{cls._count?.students || 0} 名学生</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BookOpen className="w-4 h-4" />
                    <span>{cls._count?.homeworks || 0} 个作业</span>
                  </div>
                </div>

                {/* 邀请码 */}
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-gray-600">邀请码：</span>
                  <code className="text-lg font-mono font-bold text-blue-600">{cls.inviteCode}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => handleCopyInviteCode(cls.inviteCode)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                {/* 学生列表 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">学生列表</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      onClick={() => fetchClassDetail(cls.id)}
                    >
                      刷新
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cls.students?.length ? (
                      cls.students.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={student.avatar || undefined} />
                              <AvatarFallback>{student.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{student.name}</p>
                              <p className="text-xs text-gray-500">{student.email}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleRemoveStudent(cls.id, student.id, student.name)}
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">暂无学生</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑班级</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">班级名称</label>
              <Input
                value={editClassName}
                onChange={(e) => setEditClassName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">班级描述</label>
              <Input
                value={editClassDesc}
                onChange={(e) => setEditClassDesc(e.target.value)}
              />
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleUpdateClass}
              disabled={!editClassName.trim()}
            >
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
