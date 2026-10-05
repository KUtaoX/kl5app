<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable([
    'name', 'email', 'password',
    'permission1', 'permission2', 'permission3', 'permission4', 'permission5',
    'permission6', 'permission7', 'permission8', 'permission9', 'permission10',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
    // ==============================================================
    // สิทธิ์
    //   permission1 = Admin       → ได้สิทธิ์ Add / Edit / Delete ทั้งหมด และไม่ถูกจำกัดเป็น Read Only
    //   permission2 = Can Add
    //   permission3 = Can Edit
    //   permission4 = Can Delete
    //   permission5 = Read Only
    //
    // accessor ด้านล่างทำให้ทุกที่ที่อ่าน $user->permission2–5 (ทั้งใน controller และในหน้าเว็บผ่าน auth.user)
    // ได้ค่าตามสิทธิ์ Admin อัตโนมัติ ค่าที่บันทึกในฐานข้อมูลไม่ถูกเปลี่ยน
    // ==============================================================
    public function isAdmin(): bool
    {
        return (string) ($this->attributes['permission1'] ?? '') === '1';
    }

    protected function permission2(): Attribute
    {
        return $this->grantedToAdmin('1');
    }

    protected function permission3(): Attribute
    {
        return $this->grantedToAdmin('1');
    }

    protected function permission4(): Attribute
    {
        return $this->grantedToAdmin('1');
    }

    protected function permission5(): Attribute
    {
        return $this->grantedToAdmin('0');
    }

    /** ถ้าเป็น Admin คืนค่า $adminValue แทนค่าที่บันทึกไว้ */
    private function grantedToAdmin(string $adminValue): Attribute
    {
        return Attribute::get(fn ($value) => $this->isAdmin() ? $adminValue : $value);
    }
}
