"""
Import natijalarini tekshirish
"""
import sys
import os

# Prisma client import qilish
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from prisma import Prisma
    
    prisma = Prisma()
    
    async def main():
        await prisma.connect()
        
        # Bir nechta task'ni tekshirish
        tasks = await prisma.task.find_many({
            take: 5,
            include: {
                stages: {
                    include: {
                        assigned_to: {
                            select: {
                                name: True
                            }
                        }
                    },
                    order_by: {
                        stage_order: 'asc'
                    }
                },
                client: {
                    select: {
                        name: True
                    }
                }
            },
            order_by: {
                id: 'desc'
            }
        })
        
        print(f"Tekshirilayotgan task'lar: {len(tasks)}\n")
        
        for task in tasks:
            print(f"Task: {task.title}")
            print(f"Client: {task.client.name}")
            print(f"Stages:")
            
            for stage in task.stages:
                worker_name = stage.assigned_to.name if stage.assigned_to else "None"
                status = stage.status
                print(f"  - {stage.name}: {worker_name} ({status})")
            
            print()
        
        # Umumiy statistika
        total_tasks = await prisma.task.count()
        total_stages = await prisma.task_stage.count()
        assigned_stages = await prisma.task_stage.count({
            where: {
                assigned_to_id: {
                    not: None
                }
            }
        })
        ready_stages = await prisma.task_stage.count({
            where: {
                status: 'TAYYOR'
            }
        })
        
        print("=== Umumiy statistika ===")
        print(f"Jami task'lar: {total_tasks}")
        print(f"Jami stage'lar: {total_stages}")
        print(f"Assignment qilingan stage'lar: {assigned_stages}")
        print(f"Tayyor stage'lar: {ready_stages}")
        
        await prisma.disconnect()
    
    import asyncio
    asyncio.run(main())
    
except Exception as e:
    print(f"Xatolik: {e}")
    import traceback
    traceback.print_exc()

