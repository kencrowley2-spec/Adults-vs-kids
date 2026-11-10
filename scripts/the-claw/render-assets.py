import bpy,math,os,json,sys
from mathutils import Vector,Matrix
ROOT=os.environ.get('CLAW_ASSET_SOURCE_DIR','/tmp/the-claw-sources')
OUT=os.environ.get('CLAW_ASSET_OUTPUT_DIR',ROOT+'/rendered');os.makedirs(OUT,exist_ok=True)
MODELS=ROOT+'/sourced-claw3d/public/models'
def clear(transparent=True,size=(512,512)):
 bpy.ops.wm.read_factory_settings(use_empty=True)
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=False
 scene.render.resolution_x,scene.render.resolution_y=size;scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=transparent
 scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=-.25
 world=bpy.data.worlds.new('studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.5,.55,.63,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4
 return scene

def mat(name,col,metal=0,rough=.3,emission=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*col,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emission:p.inputs['Emission Color'].default_value=(*col,1);p.inputs['Emission Strength'].default_value=emission
 return m

def area(name,loc,energy,color,size=4,target=(0,0,0)):
 data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.color=color;data.shape='DISK';data.size=size;o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o

def camera(loc,target,scale=None,lens=50):
 data=bpy.data.cameras.new('camera');o=bpy.data.objects.new('camera',data);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
 if scale:data.type='ORTHO';data.ortho_scale=scale
 else:data.lens=lens
 bpy.context.scene.camera=o;return o

def lights():
 area('key',(-3,-4,5),550,(1,.9,.74),4)
 area('softbox',(3,-2,3),450,(.65,.79,1),3)
 area('rim',(0,2,4),650,(.72,.55,1),3)

def bake_world(objs):
 for o in objs:
  if o.type=='MESH':
   o.data.transform(o.matrix_world);o.parent=None;o.matrix_world=Matrix.Identity(4)

def bounds(objs):
 pts=[o.matrix_world@Vector(v) for o in objs if o.type=='MESH' and not o.hide_render for v in o.bound_box]
 return Vector([min(v[i] for v in pts) for i in range(3)]),Vector([max(v[i] for v in pts) for i in range(3)])

def render(name):
 bpy.context.scene.render.filepath=OUT+'/'+name+'.png';bpy.ops.render.render(write_still=True)

def cabinet():
 clear(False,(800,1240));bpy.ops.import_scene.gltf(filepath=MODELS+'/boxoutnewWithOutWebp.glb');objs=list(bpy.context.scene.objects)
 silver=mat('Brushed silver',(.55,.63,.72),.8,.19);black=mat('Black enamel',(.012,.016,.03),.65,.25)
 for o in objs:
  if o.type!='MESH':continue
  if o.name not in ['body','dimian']:o.hide_render=True
  else:
   o.data.materials.clear();o.data.materials.append(silver if o.name=='other' else black)
 bake_world(objs)
 for o in objs:
  if o.type=='MESH':
   for v in o.data.vertices:v.co.z*=1.37
 def box(name,loc,scale,m,bevel=0):
  bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
  if bevel:mod=o.modifiers.new('rounded','BEVEL');mod.width=bevel;mod.segments=4;o.modifiers.new('normals','WEIGHTED_NORMAL')
  return o
 purple=mat('Violet back',(.065,.009,.19),.15,.4);red=mat('Prize floor',(.27,.009,.045),.25,.28);gold=mat('Champagne gold',(.79,.52,.11),.8,.2)
 box('Back wall',(0,.89,1.38),(1.72,.035,2.82),purple)
 box('Floor',(0,0,-.15),(1.72,1.72,.035),red)
 for side in [-1,1]:
  box('red pillar',(side*.86,-.87,1.34),(.035,.045,2.85),red,.01)
  box('Gold front edge',(side*.899,-.88,1.34),(.027,.044,2.85),gold,.008)
  box('LED',(side*.833,-.889,1.34),(.014,.015,2.75),mat('LED',( .62,.72,1),emission=6),.004)
  box('Inset LED',(side*.82,.78,1.36),(.012,.014,2.67),mat('Violet LED',(.6,.2,1),emission=4),.003)
  # Transparent side wall with restrained reflections.
  glass=mat('Side glass',(.55,.67,.9),.1,.08);p=glass.node_tree.nodes.get('Principled BSDF');p.inputs['Transmission Weight'].default_value=.92;p.inputs['IOR'].default_value=1.45;p.inputs['Alpha'].default_value=.13
  box('Glass wall',(side*.855,-.03,1.32),(.007,1.55,2.7),glass)
 box('Ceiling light',(0,.1,2.73),(1.58,.05,.025),mat('warm light',(1,.85,.55),emission=5),.005)
 box('Gantry',(0,-.05,2.62),(1.6,.055,.055),silver,.012)
 box('Gantry black',(0,-.05,2.59),(1.6,.03,.025),black,.006)
 # Deep prize chute on the left, styled to match the reference.
 box('Chute rim',(-.59,-.58,-.07),(.47,.5,.09),gold,.025)
 box('Chute opening',(-.59,-.60,-.012),(.385,.40,.014),mat('Hole',(.001,.002,.004),rough=.8),.025)
 for x in [-.805,-.375]:box('Chute rail',(x,-.59,.12),(.015,.48,.26),silver,.006)
 # Lights reflected in the real metal and side glass.
 area('Cabinet overhead',(0,-.1,2.60),35,(.75,.72,1),1.3,target=(0,0,0))
 area('Front softbox',(-1.4,-3,2.4),130,(.9,.95,1),2,target=(0,0,1.4))
 area('Right purple',(.65,.3,1.6),20,(.4,.14,1),1,target=(0,0,1.0))
 camera((0,-3.9,1.85),(0,-.03,1.34),lens=58)
 bpy.context.scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.008,.006,.025,1)
 bpy.context.scene.world.node_tree.nodes['Background'].inputs[1].default_value=.18
 render('chamber')

def sprite(kind):
 scene=clear();objs=[]
 if kind in ['dog','claw-open','claw-closed']:
  file='dogoutWithOutWebp.glb' if kind=='dog' else 'clawoutnew.glb';bpy.ops.import_scene.gltf(filepath=MODELS+'/'+file);objs=list(scene.objects)
  if kind=='dog':
   for o in objs:
    if o.type=='MESH' and '球体' in o.name:o.hide_render=True
  if kind.startswith('claw'):
   for o in objs:
    if o.type=='MESH' and (o.name.startswith('cube') or o.name in ['Icosphere','long','top-box']):o.hide_render=True
   scene.frame_set(0 if kind=='claw-open' else 20)
   bpy.context.view_layer.update()
   metal=mat('Polished chrome',(.83,.88,.95),.94,.105)
   # Retain the sourced articulated prongs, bake the pose, and upgrade the winch.
   import bmesh
   for original in list(objs):
    if original.type!='MESH' or original.hide_render:continue
    evaluated=original.evaluated_get(bpy.context.evaluated_depsgraph_get());data=bpy.data.meshes.new_from_object(evaluated);data.transform(original.matrix_world)
    bm=bmesh.new();bm.from_mesh(data);remove=[v for v in bm.verts if v.co.z>.56];bmesh.ops.delete(bm,geom=remove,context='VERTS');bm.to_mesh(data);bm.free()
    o=bpy.data.objects.new('Sourced claw prongs',data);bpy.context.collection.objects.link(o);o.data.materials.clear();o.data.materials.append(metal);original.hide_render=True
    for poly in data.polygons:poly.use_smooth=True
    bevel=o.modifiers.new('Machined edge','BEVEL');bevel.width=.005;bevel.segments=4;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
   def cylinder(name,r,depth,z,m):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=depth,location=(0,0,z));o=bpy.context.object;o.name=name;o.data.materials.append(m)
    bevel=o.modifiers.new('Beveled metal','BEVEL');bevel.width=.012;bevel.segments=4;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o
   cylinder('Hydraulic polished winch',.145,.34,.69,metal)
   cylinder('Upper cap',.154,.045,.88,metal);cylinder('Lower cap',.155,.045,.50,metal)
   cylinder('Cable mount',.033,.12,.96,metal)
   groove=mat('Dark metal grooves',(.075,.09,.13),.85,.2)
   for z in [.58,.68,.78]:
    bpy.ops.mesh.primitive_torus_add(major_radius=.145,minor_radius=.006,major_segments=64,minor_segments=8,location=(0,0,z));bpy.context.object.data.materials.append(groove)
   objs=[o for o in scene.objects if o.type=='MESH' and not o.hide_render]
 elif kind in ['cube','basketball','tennis','rainbow']:
  def ball(r,m):
   bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=32,radius=r);o=bpy.context.object;o.data.materials.append(m)
   for poly in o.data.polygons:poly.use_smooth=True
   return o
  if kind=='cube':
   colors=[(.85,.015,.045),(.02,.36,.85),(.018,.65,.15),(.98,.72,.012),(1,.98,.91),(.98,.18,.008)]
   for x in range(3):
    for y in range(3):
     for z in range(3):
      bpy.ops.mesh.primitive_cube_add(size=.27,location=((x-1)*.288,(y-1)*.288,(z-1)*.288));o=bpy.context.object
      for col in colors:o.data.materials.append(mat('Candy color',col,rough=.21))
      for poly in o.data.polygons:poly.material_index=(poly.index+x+y+z)%6
      bevel=o.modifiers.new('Rounded cubelets','BEVEL');bevel.width=.014;bevel.segments=3;o.modifiers.new('soft normals','WEIGHTED_NORMAL')
  elif kind in ['basketball','tennis']:
   m=mat('Ball leather',(.83,.255,.025) if kind=='basketball' else (.48,.81,.018),rough=.57)
   p=m.node_tree.nodes.get('Principled BSDF');noise=m.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=210;bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.24;bump.inputs['Distance'].default_value=.012;m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
   ball(.46,m);seam=mat('Seam',(.014,.009,.006) if kind=='basketball' else (.92,.98,.68),rough=.8)
   for i in range(3 if kind=='basketball' else 2):
    bpy.ops.mesh.primitive_torus_add(major_radius=.458,minor_radius=.006 if kind=='basketball' else .008,major_segments=96,minor_segments=8);o=bpy.context.object;o.data.materials.append(seam);o.rotation_euler=(math.pi/2 if i==0 else 0,math.pi/2 if i==2 else .3,0)
  else:
   cols=[(.95,.01,.06),(1,.28,.01),(1,.8,.015),(.02,.78,.19),(.025,.36,1),(.46,.05,.9)]
   for i in range(16):
    bpy.ops.mesh.primitive_torus_add(major_radius=.32,minor_radius=.026,major_segments=64,minor_segments=12,location=(math.sin(i*.3)*.06,0,(i-8)*.043));o=bpy.context.object;o.data.materials.append(mat('Rainbow',cols[i%6],rough=.2))
    for poly in o.data.polygons:poly.use_smooth=True
  objs=list(scene.objects)
 elif kind=='bear':
  bpy.ops.import_scene.gltf(filepath=ROOT+'/teddy-bear.glb');objs=list(scene.objects)
 lo,hi=bounds(objs);center=(lo+hi)/2;dim=max(hi-lo)
 # Keep the hierarchy for skinned claw animation; normalize through a new root.
 root=bpy.data.objects.new('assetRoot',None);bpy.context.collection.objects.link(root)
 roots=[o for o in objs if o.parent is None]
 for o in roots:o.parent=root
 root.location=-center/dim;root.scale=(1/dim,)*3
 if kind=='dog':root.rotation_euler.z=-.18
 root.location=-(root.rotation_euler.to_matrix()@center)/dim
 lights();camera((.65,-3,1.35),(0,0,0),scale=1.7)
 scene.render.resolution_x=512;scene.render.resolution_y=512
 render(kind)

if '--' in sys.argv:jobs=sys.argv[sys.argv.index('--')+1:]
else:jobs=['cabinet','dog','claw-open','claw-closed']
for job in jobs:
 if job=='cabinet':cabinet()
 else:sprite(job)
