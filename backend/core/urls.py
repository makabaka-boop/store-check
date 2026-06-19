from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, StoreViewSet, InspectionItemViewSet,
    TaskTemplateViewSet, InspectionTaskViewSet, TaskItemResultViewSet,
    SystemConfigViewSet, WorkbenchViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'stores', StoreViewSet)
router.register(r'inspection-items', InspectionItemViewSet)
router.register(r'task-templates', TaskTemplateViewSet)
router.register(r'tasks', InspectionTaskViewSet)
router.register(r'task-results', TaskItemResultViewSet)
router.register(r'system-config', SystemConfigViewSet)
router.register(r'workbench', WorkbenchViewSet, basename='workbench')

urlpatterns = [
    path('', include(router.urls)),
]
