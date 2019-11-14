#### 在学习ruby的初期阶段

![one](https://raw.githubusercontent.com/ybintian/ybintian.github.io/master/imgs/%E6%9C%AA%E5%91%BD%E5%90%8D%E6%96%87%E4%BB%B6.png)

没有思考太复杂的类跟对象之间的关系，之后有一天偶然得知了单件类，便开始对结构之间的关系的理解变得混乱。

#### 在学习整理singleton_class之后
梳理了下关系图
![](https://raw.githubusercontent.com/ybintian/ybintian.github.io/master/imgs/Ruby%E7%9A%84class%E5%92%8Cobject%E5%85%B3%E7%B3%BB%E5%9B%BE%EF%BC%88%E5%90%ABsingleton_class%EF%BC%89.png)

得知对象在寻找方法时，会先经过single_class,再通过祖先链向上寻找方法。而所有类的类方法都是保存在类的single_class里，因为在ruby里类也是对象。而类方法的寻找就是根据其单间类的祖先链向上寻找。

#### 在Ruby的底层里是如何实现
在了解ruby的类和对象的结构后，还是有点混乱,于是翻阅Ruby原理剖析一书。
```C
struct RUBY_ALIGNAS(SIZEOF_VALUE) RBasic {
    VALUE flags;
    const VALUE klass;
};

typedef struct rb_classext_struct rb_classext_t;

struct RClass {
  struct RBasic basic;
  VALUE super;
  rb_classext_t *ptr;
  struct rb_id_table *m_tbl;
};

struct rb_classext_struct {
  struct st_table *iv_index_tbl;
  struct st_table *iv_tbl;
  struct rb_id_table *const_tbl;
  struct rb_id_table *callable_m_tbl;
  rb_subclass_entry_t *subclasses;
  rb_subclass_entry_t **parent_subclasses;
  /**
    * In the case that this is an `ICLASS`, `module_subclasses` points to the link
    * in the module's `subclasses` list that indicates that the klass has been
    * included. Hopefully that makes sense.
    */
  rb_subclass_entry_t **module_subclasses;
  rb_serial_t class_serial;
  const VALUE origin_;
  const VALUE refined_class;
  rb_alloc_func_t allocator;
};
```
在RBasic的结构里存了flags和klass指针，klass指针就是对象的class, super指针是指向RClass的superclass的指针。而每次在定义一个Class的时候对应就会创建两个RClass，分别是Class和它的singleton_class。